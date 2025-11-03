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
   * @param {number} pingTTL
   * @param {any} data
   */
  constructor(hostname, healthCheck, pingTTL, data) {
    this.hostname = hostname;
    this.healthCheck = healthCheck;
    this.data = data;

    this.pingTTL= pingTTL;
    this.lasPingTimestamp= Date.now();
    this.wasHealthy= true;
  }

  get healthy() {
    return Date.now() < (this.lasPingTimestamp + this.pingTTL);
  }

  hadHealthChange() {
    const healthy= this.healthy;
    if( healthy === this.wasHealthy ) {
      return null;
    }
    
    this.wasHealthy= healthy;
    if( healthy ) {
      return 'healthy';
    } else {
      return 'unhealthy';
    }
  }

  ping() {
    this.lasPingTimestamp= Date.now();
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

  setInstance(hostname, healthCheck, pingTTL, data) {
    const instance = new ServiceInstance(hostname, healthCheck, pingTTL, data);
    this.serviceInstances.set(hostname, instance);

    logger.info(`Set instance '${hostname}' on service '${this.name}'`);

    this._notifySubscribers();
  }

  removeInstance(hostname) {
    const instance = this.serviceInstances.get(hostname);
    if (!instance) {
      return false;
    }

    this.serviceInstances.delete(hostname);

    logger.info(`Removed instance '${instance.hostname}' from service '${this.name}'`);

    this._notifySubscribers();

    return true;
  }

  pingInstance(hostname) {
    const instance = this.serviceInstances.get(hostname);
    if (!instance) {
      return false;
    }

    instance.ping();

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
    this.healthcheckInterval= 0;

    this._startHealthchecks();
  }

  _startHealthchecks() {
    this.healthcheckInterval= setInterval(() => {
      this.services.forEach( (service, serviceName) => {
        service.serviceInstances.forEach( instance => {
          const change= instance.hadHealthChange();
          if( change ) {
            logger.warning(`Service '${serviceName}/${instance.hostname}' became unhealthy`);
          }
        });
      });
    }, 2000);
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
    clearInterval( this.healthcheckInterval );
  }
}
