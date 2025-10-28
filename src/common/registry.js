import { apiAuthHeader } from './api.js';
import { loggerOrConsole } from './logger.js';
import { waitFor } from './util.js';

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
    }

    // Wait a little before retrying
    await waitFor(2000);
  }

  // Log if it took more than one attempt
  if (counter > 1) {
    url = new URL(url);
    logger.info(`Took ${counter} tries to reach '${url.origin}'`);
  }

  return resp;
}

export async function registerService(serviceName, hostname = null, data = {}) {
  hostname = hostname || serviceName;

  const resp = await fetchWithRetry(
    `http://${process.env.REGISTRY_NAME}/service/${serviceName}/${hostname}`,
    apiAuthHeader({
      method: 'PUT',
      body: JSON.stringify({
        healthCheck: '/health',
        data
      }),
      headers: { 'Content-Type': 'application/json' }
    })
  );

  if (!resp.ok) {
    const text = await resp.text();
    throw Error(`Could not register service (status ${resp.status}):`, text);
  }

  // Check whether a new service instance was created
  return resp.status === 201;
}

export async function registerNotification(serviceName, subscriberName, path) {
  const resp = await fetchWithRetry(
    `http://${process.env.REGISTRY_NAME}/service/${serviceName}/notify/${subscriberName}/broadcast/${path}`,
    apiAuthHeader({
      method: 'POST'
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
