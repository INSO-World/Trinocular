import { apiAuthHeader } from './api.js';
import { loggerOrConsole } from './logger.js';
import { waitFor } from './util.js';

/**
 * Try to run a fetch request in a loop util it succeeds with some status code.
 * The max number of retries can be set. Abort signals stop retrying immediately.
 * @param {string|URL|Request} url Fetch URL
 * @param {RequestInit?} options Fetch Options
 * @param {number} attempts Max number of attempts before propagating the error. Values < 1 retry indefinitely
 * @returns {Promise<Response>}
 */
async function fetchWithRetry(url, options, attempts= 0) {
  const logger = loggerOrConsole();

  let counter = 0,
    resp = null;
  while (true) {
    try {
      counter++;
      resp = await fetch(url, options);
      break;
    } catch (e) {
      // If a max number of attempts was specified and we reach it,
      // we propagate the fetch error
      if( attempts > 0 && counter >= attempts ) {
        throw e;
      }

      // Stop if we got aborted
      if( e.name === 'AbortError' ) {
        throw e;
      }
    }

    // Wait a little before retrying
    await waitFor(2000, options?.signal);
  }

  // Log if it took more than one attempt
  if (counter > 1) {
    url = new URL(url);
    logger.info(`Took ${counter} tries to reach '${url.origin}'`);
  }

  return resp;
}

/**
 * Register a service instance on the register via HTTP
 * @param {string} serviceName 
 * @param {string} hostname 
 * @param {any} data JSON payload,
 * @param {number} pingTTL
 * @param {AbortSignal?} signal
 * @returns {Promise<boolean>} Whether a new instance was created on the registry
 */
async function rpcRegisterService(serviceName, hostname, data, pingTTL, signal= null) {
  loggerOrConsole().info(`Registering at '${process.env.REGISTRY_NAME}' as '${serviceName}/${hostname}'`)

  const resp = await fetchWithRetry(
    `http://${process.env.REGISTRY_NAME}/service/${serviceName}/${hostname}`,
    apiAuthHeader({
      method: 'PUT',
      body: JSON.stringify({
        healthCheck: '/health',
        data,
        pingTTL
      }),
      headers: { 'Content-Type': 'application/json' },
      signal
    })
  );

  if (!resp.ok) {
    const text = await resp.text();
    throw Error(`Could not register service (status ${resp.status}):`, text);
  }

  // Check whether a new service instance was created
  return resp.status === 201;
}

/**
 * Send a ping to a service instance on the registry to mark it as healthy
 * @param {string} serviceName 
 * @param {string} hostname 
 * @param {AbortSignal} signal 
 */
async function rpcPingService(serviceName, hostname, signal) {
  const resp = await fetchWithRetry(
    `http://${process.env.REGISTRY_NAME}/service/${serviceName}/${hostname}/ping`,
    apiAuthHeader({
      method: 'PUT',
      signal
    }),
    3 // Try up to 3 times to ping
  );

  if (!resp.ok) {
    const text = await resp.text();
    throw Error(`Could not ping service (status ${resp.status}):`, text);
  }
}

/**
 * Register a notification for a service pair on the registry via HTTP
 * @param {string} serviceName Service to send notifications on changes
 * @param {string} subscriberName Service to receive notifications
 * @param {string} path Path to be fetched/called on the instances of the subscriber service
 * @param {AbortSignal} signal 
 */
async function rpcRegisterNotification(serviceName, subscriberName, path, signal= null) {
  const resp = await fetchWithRetry(
    `http://${process.env.REGISTRY_NAME}/service/${serviceName}/notify/${subscriberName}/broadcast/${path}`,
    apiAuthHeader({
      method: 'POST',
      signal
    })
  );

  if (!resp.ok) {
    const text = await resp.text();
    throw Error(
      `Could not register notification '${serviceName}' -> '${subscriberName}/${path}' (status ${resp.status}):`,
      text
    );
  }
}

class ServiceRegistration {
  /**
   * @param {string} serviceName 
   * @param {string} hostname 
   * @param {any} data 
   * @param {number} pingTTL 
   */
  constructor(serviceName, hostname, data, pingTTL) {
    /** @type {AbortController?} */
    this.abortController= null;

    this.serviceName= serviceName;
    this.hostname= hostname;
    this.data= data;
    this.pingTTL= pingTTL;
  }

  async register( signal= null ) {
    return await rpcRegisterService(this.serviceName, this.hostname, this.data, this.pingTTL, signal);
  }

  async ping( signal= null ) {
    await rpcPingService(this.serviceName, this.hostname, signal);
  }
}

class NotificationRegistration {
  constructor(serviceName, subscriberName, path) {
    this.serviceName= serviceName;
    this.subscriberName= subscriberName;
    this.path= path;
  }

  async register( signal= null ) {
    await rpcRegisterNotification(this.serviceName, this.subscriberName, this.path, signal);
  }
}

/** @type {ServiceRegistration[]} */
const serviceRegistrations= [];

/** @type {NotificationRegistration[]} */
const notificationRegistrations= [];

/** @type {AbortController?} */
let pingLoopAbortController= null;

let pingSleepTime= Number.MAX_SAFE_INTEGER;

async function sendPingsWithInterval() {
  // We only leave this loop when we get an exception.
  // Either from a fetch error because the registry is not reachable or a bad
  // status code (eg. 404 when the registry restarts and forgets our registration).
  // Aborting also results in an abort error exception that stops the loop.
  while(true) {
    pingLoopAbortController= new AbortController();
    const signal= pingLoopAbortController.signal;

    await waitFor(pingSleepTime, signal);
    
    for( const registration of serviceRegistrations ) {
      await registration.ping( signal );
    }
  }
}

async function startRegistryPings( ttl= 0 ) {
  // Update the sleep time -> We might need to shorten the sleep time if
  // another service with a shorter ttl is registered
  if( ttl > 0 ) {
    const sleepTime= Math.round( ttl / 2 );
    pingSleepTime= Math.min( pingSleepTime, sleepTime );
  }

  if(pingLoopAbortController) {
    return;
  }

  while(true) {
    // Start the ping loop
    try {
      await sendPingsWithInterval();

    } catch( e ) {
      // When the ping loop was interrupted via aborting we stop
      if( e.name === 'AbortError' ) {
        return;
      }

      loggerOrConsole().error(`Could not ping registry. Reconnecting... (error: ${e.name}: ${e.message})`);
    }

    // We stopped pinging due to some other error -> Try to reconnect and
    // register again. Then we can go back to pinging
    try {
      pingLoopAbortController= new AbortController();
      const signal= pingLoopAbortController.signal;
      for( const registration of serviceRegistrations ) {
        await registration.register( signal );
      }

      for( const registration of notificationRegistrations ) {
        await registration.register( signal );
      }

    } catch( e ) {
      if( e.name === 'AbortError' ) {
        return;
      }

      throw e;
    }
  }
}

export function stopRegistryPings() {
  if( pingLoopAbortController ) {
    pingLoopAbortController.abort();
  }
}

/**
 * @param {string} serviceName 
 * @param {string} hostname 
 * @param {any} data JSON payload
 * @param {number} ttl 
 * @returns 
 */
export async function registerService(serviceName, hostname = null, data = {}, ttl= 0) {
  hostname = hostname || serviceName;
  ttl= ttl <= 0 ? 10 * 1000 : ttl;

  const registration= new ServiceRegistration(serviceName, hostname, data, ttl);
  const didCreate= await registration.register();

  // Only push the registration after we successfully registered
  serviceRegistrations.push( registration );

  startRegistryPings( ttl ); // Do not await!

  return { didCreate, registration };
}

/**
 * @param {string} serviceName Service to send notifications on changes
 * @param {string} subscriberName Service to receive notifications
 * @param {string} path Path to be fetched/called on the instances of the subscriber service
 */
export async function registerNotification(serviceName, subscriberName, path) {
  const registration= new NotificationRegistration(serviceName, subscriberName, path);
  await registration.register();

  // Only push the registration after we successfully registered
  notificationRegistrations.push( registration );
}

/**
 * Get the current status of a named service on the registry
 * @param {string} serviceName
 * @param {number} attempts Number of attempts to make to reach the registry
 * @returns {Promise<{hostname: string, healthCheck: string, healthy: boolean, data: any}[]>}
 */
export async function getServiceStatus(serviceName, attempts= 1) {
  const resp = await fetchWithRetry(
    `http://${process.env.REGISTRY_NAME}/service/${serviceName}`,
    apiAuthHeader()
  );

  if (!resp.ok) {
    const text = await resp.text();
    throw Error(`Could get status of service '${serviceName}' (status ${resp.status}):`, text);
  }

  return await resp.json();
}
