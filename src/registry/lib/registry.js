import { apiAuthHeader, logger } from '../../common/index.js';

class NotificationSubscriber {
  /**
   * @param {string} serviceName
   * @param {string} type
   * @param {string} path
   */
  constructor(serviceName, type, path) {
    this.serviceName = serviceName;
    this.type = type;
    this.path = path;
  }

  isEqual(other) {
    return (
      this.serviceName === other.serviceName && this.type === other.type && this.path === other.path
    );
  }
}

class ServiceInstance {
  /**
   * @param {string} hostname
   * @param {string} healthCheck
   * @param {any} data
   */
  constructor(hostname, healthCheck, data) {
    this.hostname = hostname;
    this.healthCheck = healthCheck;
    this.data = data;

    this.healthy = true;
    this.healthCheckTimer = null;
    this.heathCheckAbortController = null;
  }

  stopHealthChecks() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;

      if (this.heathCheckAbortController) {
        this.heathCheckAbortController.abort();
        this.heathCheckAbortController = null;
      }
    }
  }

  startHealthChecks() {
    if (!this.healthCheckTimer && this.healthCheck) {
      this.healthCheckTimer = setInterval(() => this._doHealthCheck(), 5000);
    }
  }

  async _doHealthCheck() {
    try {
      this.heathCheckAbortController = new AbortController();

      const signal = this.heathCheckAbortController.signal;
      const resp = await fetch(
        'http://' + this.hostname + this.healthCheck,
        apiAuthHeader({ signal })
      );

      // Print whenever the health status changes
      if (this.healthy && !resp.ok) {
        logger.warning(`Service instance '${this.hostname}' became unhealthy`);
      } else if (!this.healthy && resp.ok) {
        logger.warning(`Service instance '${this.hostname}' is healthy again`);
      }

      this.healthy = resp.ok;
    } catch (e) {
      // Do nothing when the health check was aborted
      if (e.name === 'AbortError') {
        return;
      }

      // Only print the error once so the log does not become too noisy
      if (this.healthy) {
        logger.error(`Health check for '${this.hostname}${this.healthCheck}' failed: %s`, e.name);
      }

      this.healthy = false;
    } finally {
      this.heathCheckAbortController = null;
    }
  }
}

class Service {
  /**
   * @param {string} name
   */
  constructor(name) {
    this.name = name;

    /** @type {Map<string, ServiceInstance>} */
    this.serviceInstances = new Map();

    /** @type {NotificationSubscriber[]} */
    this.subscribers = [];

    this.queueCounter = 0;
  }

  setInstance(hostname, healthCheck, data) {
    // Stop healthchecks of the old item before deleting it
    this.serviceInstances.get( hostname )?.stopHealthChecks();

    const instance = new ServiceInstance(hostname, healthCheck, data);
    this.serviceInstances.set(hostname, instance);

    instance.startHealthChecks();

    logger.info(`Set instance '${hostname}' on service '${this.name}'`);

    this._notifySubscribers();
  }

  removeInstance(hostname) {
    const instance = this.serviceInstances.get(hostname);
    if (!instance) {
      return false;
    }

    instance.stopHealthChecks();
    this.serviceInstances.delete(hostname);

    logger.info(`Removed instance '${instance.hostname}' from service '${this.name}'`);

    this._notifySubscribers();

    return true;
  }

  addNotifySubscriber(serviceName, type, path) {
    const subscriber = new NotificationSubscriber(serviceName, type, path);
    const alreadyExists = this.subscribers.some(sub => subscriber.isEqual(sub));
    if (alreadyExists) {
      logger.error(
        `Duplicate subscriber '${serviceName}' on service '${this.name}' (${type}/${path})`
      );
      return;
    }

    this.subscribers.push(subscriber);
    logger.info(`Added subscriber '${serviceName}' to service '${this.name}' (${type}/${path})`);
  }

  removeNotifySubscriber(serviceName, type, path) {
    const subscriber = new NotificationSubscriber(serviceName, type, path);
    const index = this.subscribers.findIndex(sub => subscriber.isEqual(sub));
    if (index < 0) {
      return false;
    }

    this.subscribers.splice(index, 1);
    logger.info(`Removed subscriber '${serviceName}' from service '${this.name}' (${type}/${path})`);

    return true;
  }

  serviceData() {
    const result = [];
    this.serviceInstances.forEach(instance => {
      result.push({
        hostname: instance.hostname,
        healthCheck: instance.healthCheck,
        healthy: instance.healthy,
        data: instance.data
      })
    });

    return result;
  }

  async broadcast(method, path, queryParams, body) {
    // Create URL used to send request to each service instance in the group
    const url = new URL('http://dummy-hostname');
    url.pathname = path;

    for (const key in queryParams) {
      url.searchParams.set(key, queryParams[key]);
    }

    // Send request to each service
    const requests = [];
    this.serviceInstances.forEach(instance => {
      // Set the hostname of the instance
      url.hostname = instance.hostname;

      requests.push(
        fetch(
          url,
          apiAuthHeader({
            method,
            body: JSON.stringify(body),
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': '_ignore_' }
          })
        )
      );
    });

    // Wait for all requests to finish in parallel
    let success = true;
    const responseResults = await Promise.allSettled(requests);
    for (const result of responseResults) {
      if (result.status === 'rejected') {
        logger.error(`Could not broadcast for service '${this.name}': %s`, result.reason);
        console.log('Reason', result.reason);
        success = false;
      } else if (!result.value.ok) {
        logger.warning(
          `Broadcast to '${result.value.url}' on service '${this.name}' returned with status ${result.value.status}`
        );
        success = false;
      }
    }

    return success;
  }

  async _notifySubscribers() {
    const updateData = {
      service: this.name
    };

    for (const subscriber of this.subscribers) {
      const service = Registry.the().service(subscriber.serviceName);
      if (!service) {
        continue;
      }

      let success = false;
      if (subscriber.type === 'broadcast') {
        success = service.broadcast('POST', subscriber.path, updateData);
      } else {
        // TODO: Queues are not implemented yet
      }

      if (!success) {
        logger.error(
          `Could not notify subscriber '${subscriber.serviceName}' of service '${this.name}' via ${subscriber.type}`
        );
      }
    }
  }

  stop() {
    // Stop all health checks
    this.serviceInstances.forEach(instance => instance.stopHealthChecks());
  }
}

export class Registry {
  /** @type {Registry?} */
  static _instance = null;

  static create() {
    if (!Registry._instance) {
      Registry._instance = new Registry();
    }
  }

  static the() {
    return this._instance;
  }

  constructor() {
    /** @type {Map<string, Service>} */
    this.services = new Map();
  }

  service(name) {
    return this.services.get(name) || null;
  }

  ensureService(name) {
    let service = this.services.get(name);
    if (!service) {
      service = new Service(name);
      this.services.set(name, service);
    }

    return service;
  }

  stop() {
    logger.info(`Stopping registry`);
    this.services.forEach(service => service.stop());
  }
}
