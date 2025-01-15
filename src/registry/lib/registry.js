import { apiAuthHeader } from '../../common/index.js';

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
    this.heathCheckAbortController= null;
  }

  stopHealthChecks() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;

      if( this.heathCheckAbortController ) {
        this.heathCheckAbortController.abort();
        this.heathCheckAbortController= null;
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
      this.heathCheckAbortController= new AbortController();

      const signal= this.heathCheckAbortController.signal;
      const resp = await fetch('http://' + this.hostname + this.healthCheck, apiAuthHeader({ signal }));
      this.healthy = resp.ok;
      
    } catch (e) {
      // Do nothing when the health check was aborted
      if (e.name === 'AbortError') {
        return;
      }

      console.log(`Health check for '${this.hostname}${this.healthCheck}' failed:`, e.name);
      this.healthy = false;

    } finally {
      this.heathCheckAbortController= null;
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

    this.idCounter = 0;
    this.queueCounter = 0;
  }

  createInstance(hostname, healthCheck, data) {
    let hostNameExists = false;
    this.serviceInstances.forEach(instance => (hostNameExists ||= instance.hostname === hostname));
    if (hostNameExists) {
      return null;
    }

    const id = 'id_' + this.idCounter++;
    const instance = new ServiceInstance(hostname, healthCheck, data);
    this.serviceInstances.set(id, instance);

    instance.startHealthChecks();

    console.log(`Added instance '${hostname}' (id ${id}) to service '${this.name}'`);

    this._notifySubscribers();

    return id;
  }

  updateInstance(id, hostname, healthCheck, data) {
    const instance = this.serviceInstances.get(id);
    if (!instance) {
      return false;
    }

    instance.hostname = hostname;
    instance.healthCheck = healthCheck;
    instance.data = data;

    // If we could not start health checks before, try again with new data
    instance.stopHealthChecks();
    instance.startHealthChecks();

    this._notifySubscribers();

    return true;
  }

  removeInstance(id) {
    const instance = this.serviceInstances.get(id);
    if (!instance) {
      return false;
    }

    instance.stopHealthChecks();
    this.serviceInstances.delete(id);

    console.log(`Removed instance '${instance.hostname}' (id ${id}) to service '${this.name}'`);

    this._notifySubscribers();

    return true;
  }

  addNotifySubscriber(serviceName, type, path) {
    const subscriber = new NotificationSubscriber(serviceName, type, path);
    const alreadyExists = this.subscribers.some(sub => subscriber.isEqual(sub));
    if (alreadyExists) {
      console.log(
        `Duplicate subscriber '${serviceName}' to service '${this.name}' (${type}/${path})`
      );
      return;
    }

    this.subscribers.push(subscriber);
    console.log(`Added subscriber '${serviceName}' to service '${this.name}' (${type}/${path})`);
  }

  removeNotifySubscriber(serviceName, type, path) {
    const subscriber = new NotificationSubscriber(serviceName, type, path);
    const index = this.subscribers.findIndex(sub => subscriber.isEqual(sub));
    if (index < 0) {
      return false;
    }

    this.subscribers.splice(index, 1);
    console.log(`Removed subscriber '${serviceName}' to service '${this.name}' (${type}/${path})`);

    return true;
  }

  serviceData() {
    const result = {};
    this.serviceInstances.forEach((instance, id) => {
      result[id] = {
        hostname: instance.hostname,
        healthCheck: instance.healthCheck,
        healthy: instance.healthy,
        data: instance.data
      };
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
            headers: { 'Content-Type': 'application/json' }
          })
        )
      );
    });

    // Wait for all requests to finish in parallel
    let success = true;
    const responseResults = await Promise.allSettled(requests);
    for (const result of responseResults) {
      if (result.status === 'rejected') {
        console.log(`Could not broadcast for service '${this.name}':`, result.reason);
        success = false;
      } else if (!result.value.ok) {
        console.log(
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
        console.error(
          `Could not notify subscriber '${subscriber.serviceName}' of service '${this.name}' via ${subscriber.type}`
        );
      }
    }
  }

  stop() {
    // Stop all health checks
    this.serviceInstances.forEach( instance => instance.stopHealthChecks() );
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
    console.log(`Stopping registry`);
    this.services.forEach( service => service.stop() );
  }
}
