import { apiAuthHeader, logger } from '../../common/index.js';

/**
 * @param {string} transactionId
 * @returns {Object?}
 */
export async function getTaskStatus(transactionId) {
  try {
    const resp = await fetch(
      `http://${process.env.SCHEDULER_NAME}/task/${transactionId}`,
      apiAuthHeader()
    );

    if (!resp.ok) {
      logger.error(`Could not get status of task '${transactionId}' (status ${resp.status})`);
      return null;
    }

    return await resp.json();
  } catch (e) {
    logger.error(`Could not get status of task '${transactionId}': %s`, e);
    return null;
  }
}

/**
 * @param {string} uuid Repository UUID
 * @param {string?} doneCallback
 */
export async function submitSchedulerTask(uuid, doneCallback = undefined) {
  try {
    const resp = await fetch(
      `http://${process.env.SCHEDULER_NAME}/task`,
      apiAuthHeader({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uuid, doneCallback })
      })
    );

    if (!resp.ok) {
      return null;
    }

    const data = await resp.json();

    if (!data || !data.transactionId) {
      logger.error(
        `Scheduler sent invalid response when submitting task for repository '${uuid}': ${JSON.stringify(data)}`
      );
      return null;
    }

    return data.transactionId;
  } catch (e) {
    logger.error(`Could not submit task to scheduler to update repository '${uuid}': %s`, e);
    return null;
  }
}

/**
 * Create a new repository on the api bridge service
 * @param {string} name
 * @param {string} url
 * @param {string} authToken
 * @param {string} type
 * @param {string} uuid
 * @returns {{error: string}|{repo: any}} error message or repository data
 */
export async function createRepositoryOnApiBridge(name, url, authToken, type, uuid) {
  try {
    const resp = await fetch(
      `http://${process.env.API_BRIDGE_NAME}/repository`,
      apiAuthHeader({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, url, authToken, type, uuid })
      })
    );

    if (!resp.ok) {
      const message = await resp.text();
      return {
        error: `Could not submit new repository to API service: ${message}`
      };
    }

    const repo = await resp.json();
    return { repo };
  } catch (e) {
    return { error: `Could not connect to API service` };
  }
}

/**
 * @param {string} serviceName
 * @param { string } uuid
 * @returns {Promise<string>}
 */
export async function deleteRepositoryOnService(serviceName, uuid) {
  try {
    const resp = await fetch(
      `http://${serviceName}/repository/${uuid}`,
      apiAuthHeader({ method: 'DELETE' })
    );

    if (!resp.ok) {
      const message = await resp.text();
      return `Could not delete repository from ${serviceName} service: ${message}`;
    }
  } catch (e) {
    return `Could not connect to ${serviceName} service`;
  }
}

/**
 *
 * @param uuid
 * @returns {Promise<string>}
 */
export async function deleteRepositoryOnSchedulerService(uuid) {
  try {
    const resp = await fetch(
      `http://${process.env.SCHEDULER_NAME}/schedule/${uuid}`,
      apiAuthHeader({ method: 'DELETE' })
    );

    if (!resp.ok) {
      const message = await resp.text();
      return `Could not delete repository from scheduler service: ${message}`;
    }
  } catch (e) {
    return `Could not connect to scheduler service`;
  }
}

/**
 *
 * @param uuid
 * @returns {Promise<string>}
 */
export async function deleteRepositoryOnAllVisualizationServices(uuid) {
  try {
    const resp = await fetch(
      `http://${process.env.REGISTRY_NAME}/service/${process.env.VISUALIZATION_GROUP_NAME}/broadcast/api/repository/${uuid}`,
      apiAuthHeader({ method: 'DELETE' })
    );

    if (!resp.ok) {
      const message = await resp.text();
      return `Could not delete repository from some visualization service: ${message}`;
    }
  } catch (e) {
    return `Could not connect to registry service`;
  }
}

/**
 * Fetches the current repository data from the API bridge
 * The returned repo contains data according to the API bridge "get repository" endpoint
 * @param {string} uuid
 * @returns {Promise<{error: string}|any>}
 */
export async function getRepositoryFromAPIService(uuid) {
  try {
    const resp = await fetch(
      `http://${process.env.API_BRIDGE_NAME}/repository/${uuid}`,
      apiAuthHeader({ method: 'GET' })
    );

    if (!resp.ok) {
      const message = await resp.text();
      return {
        error: `Could not get repository data from API service: ${message}`
      };
    }

    return await resp.json();
  } catch (e) {
    return { error: `Could not connect to API service` };
  }
}

export async function getDatasourceForRepoFromAPIService(datasource, uuid) {
  try {
    const resp = await fetch(
      `http://${process.env.API_BRIDGE_NAME}/bridge/${uuid}/${datasource}`,
      apiAuthHeader({ method: 'GET' })
    );

    if (!resp.ok) {
      const message = await resp.text();
      return {
        error: `Could not get datasource ${datasource} for repository ${uuid} from API service: ${message}`
      };
    }

    return await resp.json();
  } catch (e) {
    return { error: `Could not connect to API service` };
  }
}

/**
 * Fetches Repository data from the repo service
 * the returned resp.json() object holds data according to the get-repository endpoint of the repo service
 * @param {string} uuid
 * @returns {Promise<{error: string}|any>}
 */
export async function getRepositoryFromRepoService(uuid) {
  try {
    const resp = await fetch(
      `http://${process.env.REPO_NAME}/repository/${uuid}`,
      apiAuthHeader({ method: 'GET' })
    );

    if (!resp.ok) {
      const message = await resp.text();
      return {
        error: `Could not get repository data from repo service: ${message}`
      };
    }

    return await resp.json();
  } catch (e) {
    return { error: `Could not connect to repo service` };
  }
}

/**
 *
 * @param uuid
 * @returns {Promise<{cadence: number, startDate: Date, enableSchedule: boolean}|{error: string}|{enableSchedule: boolean}>}
 */
export async function getScheduleFromSchedulerService(uuid) {
  try {
    const resp = await fetch(
      `http://${process.env.SCHEDULER_NAME}/schedule/${uuid}`,
      apiAuthHeader({ method: 'GET' })
    );

    // there is no schedule for the repository
    if (resp.status === 404) {
      return { enableSchedule: false };
    }
    // other error
    if (!resp.ok) {
      const message = await resp.text();
      return {
        error: `Could not get repository data from Scheduler service: ${message}`
      };
    }

    // schedule object according to "get schedule by uuid" endpoint of the scheduler service
    const schedule = await resp.json();

    schedule.enableSchedule = true;
    schedule.startDate = new Date(schedule.startDate);

    return schedule;
  } catch (e) {
    return { error: `Could not connect to Scheduler service` };
  }
}

/**
 * Create a new repository on the repo service
 * @param {string} name
 * @param {string} type
 * @param {string} gitUrl
 * @param {string} uuid
 * @param {string} authToken
 * @returns {string?} error message
 */
export async function createRepositoryOnRepoService(name, type, gitUrl, uuid, authToken) {
  try {
    const resp = await fetch(
      `http://${process.env.REPO_NAME}/repository/${uuid}`,
      apiAuthHeader({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type, gitUrl, authToken })
      })
    );

    if (!resp.ok) {
      const message = await resp.text();
      return `Could not submit new repository to repo service: ${message}`;
    }

    return null;
  } catch (e) {
    return `Could not connect to repo service`;
  }
}

/**
 * Set default schedule for repository
 * @param {string} uuid
 * @returns {string?} error message
 */
export async function createDefaultSchedule(uuid) {
  try {
    const defaultSchedule = {
      cadence: 24 * 60 * 60, // Cadence is given in seconds, default 1 day
      startTime: new Date().toISOString()
    };

    const resp = await fetch(
      `http://${process.env.SCHEDULER_NAME}/schedule/${uuid}`,
      apiAuthHeader({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(defaultSchedule)
      })
    );

    if (!resp.ok) {
      const message = await resp.text();
      return `Could not submit schedule for regular snapshots: ${message}`;
    }

    return null;
  } catch (e) {
    return `Could not connect to scheduler service`;
  }
}

/**
 *
 * @param uuid
 * @param cadence
 * @param startTime
 * @returns {Promise<null|string>}
 */
export async function sendScheduleUpdate(uuid, cadence, startTime) {
  try {
    const schedule = { cadence, startTime };

    const resp = await fetch(
      `http://${process.env.SCHEDULER_NAME}/schedule/${uuid}`,
      apiAuthHeader({
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schedule)
      })
    );

    if (!resp.ok) {
      const message = await resp.text();
      return `Could not submit schedule for regular snapshots: ${message}`;
    }

    return null;
  } catch (e) {
    return `Could not connect to scheduler service`;
  }
}

/**
 * Send Updates to a service that has the PUT /repository/:uuid endpoint
 * The caller of this method has to make sure that "data" corresponds with the
 * endpoint the service with serviceName
 * @param serviceName name of the called service
 * @param uuid uuid of the repository to be updated
 * @param data data to be updated
 * @returns {string | void}
 */
export async function sendRepositoryUpdateToService(serviceName, uuid, data) {
  try {
    const resp = await fetch(
      `http://${serviceName}/repository/${uuid}`,
      apiAuthHeader({
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
    );

    if (!resp.ok) {
      const message = await resp.text();
      return `Could not update repository data on ${serviceName} service: ${message}`;
    }
  } catch (e) {
    return `Could not connect to ${serviceName} service`;
  }
}
