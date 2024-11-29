import {apiAuthHeader} from '../../common/index.js';

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
      console.error(`Could not get status of task '${transactionId}' (status ${resp.status})`);
      return null;
    }

    return await resp.json();
  } catch (e) {
    console.error(`Could not get status of task '${transactionId}':`, e);
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
      console.error(
        `Scheduler sent invalid response when submitting task for repository '${uuid}': ${JSON.stringify(data)}`
      );
      return null;
    }

    return data.transactionId;
  } catch (e) {
    console.error(`Could not submit task to scheduler to update repository '${uuid}'`);
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

// TODO remove before merge
export async function getAllRepositoriesFromApiBridge() {
  try {
    const resp = await fetch(
      `http://${process.env.API_BRIDGE_NAME}/repository`,
      apiAuthHeader({
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })
    );

    if (!resp.ok) {
      const message = await resp.text();
      return {
        error: `Could not get repositories from API service: ${message}`
      };
    }

    return await resp.json();
  } catch (e) {
    return { error: `Could not connect to API service` };
  }
}
//

/**
 * Create a new repository on the repo service
 * @param {string} name
 * @param {string} type
 * @param {string} gitUrl
 * @param {string} uuid
 * @returns {string?} error message
 */
export async function createRepositoryOnRepoService(name, type, gitUrl, uuid) {
  try {
    const resp = await fetch(
      `http://${process.env.REPO_NAME}/repository/${uuid}`,
      apiAuthHeader({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type, gitUrl })
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
      uuid,
      cadence: 24 * 60 * 60, // Cadence is given in seconds, default 1 day
      startTime: new Date().toISOString()
    };

    const resp = await fetch(
      `http://${process.env.SCHEDULER_NAME}/schedule`,
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
