import { randomUUID } from 'crypto';
import { visualizationHostnames } from './visualizations.js';
import { apiAuthHeader, logger } from '../../common/index.js';
import { memcachedInstance as memcached } from './memcached-connection.js';

/** @typedef {import('./scheduler.js').Schedule} Schedule*/

// FIXME: This is a temporary value only useful for testing, in production a larger one should be used!
const TASK_CALLBACK_TIMEOUT = 60 * 1000;

// Memcached data lifetime in _seconds_
const DISTRIBUTED_STATE_RETENTION_TIME= 20 * 60;

// Do not change the string values as they are returned from the API, and other
// services expect them
export const TaskState = {
  Pending: 'pending',
  Error: 'error',
  Done: 'done',
  UpdatingApiService: 'updating_api_service',
  UpdatingRepoService: 'updating_repo_service',
  UpdatingVisualizations: 'updating_visualizations'
};

export class UpdateTask {
  /**
   * @param {string} repoUuid
   * @param {Schedule?} schedule
   * @param {string?} httpDoneCallback
   */
  constructor(repoUuid, schedule = null, httpDoneCallback = null) {
    this.repoUuid = repoUuid;
    this.schedule = schedule;
    this.httpDoneCallback = httpDoneCallback;

    /** @type {string} */
    this.state = TaskState.Pending;

    this.transactionId = randomUUID();

    /** @type {string[]?} */
    this.expectedCallers = null;

    /** @type {{resolve: function(string):void, reject: function():void}?} */
    this.callbackPromise = null;
    this.callbackTimeout = null;

    this.visualizationServiceCount = 0;
    this.visualizationServiceCounter = 0;
  }

  async _setAndDistributeState( state, error= null ) {
    this.state= state;

    const stateKey= `scheduler-transaction-${this.transactionId}`;
    const repoKey= `scheduler-repo-${this.repoUuid}`;
    const stateJson= JSON.stringify({
      ...this.toSerializable(),
      repositoryCacheKey: repoKey,
      error
    });

    try {
      await Promise.all([
        memcached.set(stateKey, stateJson, DISTRIBUTED_STATE_RETENTION_TIME),
        memcached.set(repoKey, stateKey, DISTRIBUTED_STATE_RETENTION_TIME),
      ]);

    // A failure during distributing the state is nothing that should propagate, especially
    // as state updates are part of other error handling paths
    } catch( error ) {
      logger.error(`Could not update distributed state (state ${this.state}, transactionId '${this.transactionId}') %s`, error);
    }
  }

  async taskQueued() {
    if (!this.is(TaskState.Pending)) {
      throw Error('Cannot queue active task');
    }

    await this._setAndDistributeState( this.state );
  }

  is(state) {
    return this.state === state;
  }

  isDone() {
    return this.is(TaskState.Done) || this.is(TaskState.Error);
  }

  visualizationProgress() {
    if (this.state !== TaskState.UpdatingVisualizations) {
      return null;
    }

    return {
      counter: this.visualizationServiceCounter,
      count: this.visualizationServiceCount
    };
  }

  toSerializable() {
    return {
      transactionId: this.transactionId,
      repoUuid: this.repoUuid,
      schedule: this.schedule
        ? {
            cadence: this.schedule.cadence
          }
        : null,
      state: this.state,
      visualizationProgress: this.visualizationProgress()
    };
  }

  async _sendSnapshotRequestAndWait(hostname) {
    logger.info(`Sending snapshot request to '${hostname}'`);

    const response = await fetch(
      `http://${hostname}/snapshot/${this.repoUuid}?transactionId=${this.transactionId}`,
      apiAuthHeader({ method: 'POST' })
    );

    if (!response.ok) {
      throw Error(`${hostname} did not respond OK (status: ${response.status})`);
    }

    await this._waitForCallback(hostname);
  }

  /**
   * Runs the update task by calling first the API bridge, then the repo service
   * and finally the visualizations (via the registry) to update themselves.
   * Between each request the task waits for the respective service to perform
   * a callback to the scheduler with the task's transaction id. Only then
   * we advance to the next step.
   * @returns {Promise<void>}
   */
  async run() {
    if (!this.is(TaskState.Pending)) {
      return;
    }

    try {
      // 1. Send request to api-service
      logger.info(
        `[1/3] Sending snapshot request to api bridge (transactionId '${this.transactionId}')`
      );
      await this._setAndDistributeState( TaskState.UpdatingApiService );
      await this._sendSnapshotRequestAndWait(process.env.API_BRIDGE_NAME);

      // 2. Send request to repo-service
      logger.info(
        `[2/3] Sending snapshot request to repo service (transactionId '${this.transactionId}')`
      );
      await this._setAndDistributeState( TaskState.UpdatingRepoService );
      await this._sendSnapshotRequestAndWait(process.env.REPO_NAME);

      // 3. Send request to registry
      logger.info(
        `[3/3] Sending snapshot request to visualization group on registry (${visualizationHostnames.size} services, transactionId '${this.transactionId}')`
      );

      await this._setAndDistributeState( TaskState.UpdatingVisualizations );
      const registryResponse = await fetch(
        `http://${process.env.REGISTRY_NAME}/service/${process.env.VISUALIZATION_GROUP_NAME}/broadcast/api/snapshot/${this.repoUuid}?transactionId=${this.transactionId}`,
        apiAuthHeader({ method: 'POST' })
      );

      if (!registryResponse.ok) {
        throw new Error(
          `Registry did not respond OK when broadcasting (status: ${registryResponse.status})`
        );
      }

      // Wait for all registered visualization services to respond
      let services = [...visualizationHostnames.keys()];
      this.visualizationServiceCount = services.length;

      while (services.length) {
        // Wait for services and remove each from the array when it responds
        const caller = await this._waitForCallback(services);
        services.splice(services.indexOf(caller), 1);

        // Increment the progress counter
        this.visualizationServiceCounter++;
      }

      await this._setAndDistributeState( TaskState.Done );

    } catch (e) {
      await this._setAndDistributeState( TaskState.Error, e.message );

      logger.error(
        `Could not run update task '${this.transactionId}' for '${this.repoUuid}': %s`,
        e
      );
    } finally {
      await this._performHttpDoneCallback();
    }
  }

  /**
   * @param {string | string[]} expectedCallers
   * @returns {Promise<string>}
   */
  _waitForCallback(expectedCallers) {
    if (this.callbackPromise) {
      throw Error('Cannot wait for more than one callback');
    }

    // Save the expected callers and start a timeout timer
    this.expectedCallers = Array.isArray(expectedCallers) ? expectedCallers : [expectedCallers];
    this.callbackTimeout = setTimeout(() => this._timeoutCallback(), TASK_CALLBACK_TIMEOUT);

    // Create a promise the calling function await on
    return new Promise((resolve, reject) => {
      this.callbackPromise = { resolve, reject };
    });
  }

  _timeoutCallback() {
    if (this.callbackPromise) {
      const { reject } = this.callbackPromise;

      // Clear the timeout and promise fields
      this.callbackTimeout = null;
      this.callbackPromise = null;

      // Reject the promise with a timeout error
      reject(
        new Error(
          `Callback for task '${this.transactionId}' timed out waiting for: ${this.expectedCallers.join(', ')}`
        )
      );
    }
  }

  /**
   * Callback invoked by services informing the task that they have finished updating themselves.
   * @param {string} caller
   * @param {string?} error Setting this error fails the task with the provided message
   * @returns {boolean} success
   */
  callback(caller, error = null) {
    if (!this.callbackPromise) {
      logger.error(`Task '${this.transactionId}' received unexpected callback from '${caller}'`);
      return false;
    }

    if (typeof caller !== 'string') {
      logger.error(`Invalid caller value '${caller}'`);
      return false;
    }

    // Stop the timeout timer
    clearTimeout(this.callbackTimeout);
    this.callbackTimeout = null;

    // Get the resolver functions of the pending promise and clear it
    const { resolve, reject } = this.callbackPromise;
    this.callbackPromise = null;

    // Reject the promise if the caller is wrong
    caller = caller.trim().toLowerCase();
    if (!this.expectedCallers.includes(caller)) {
      reject(
        new Error(
          `Callback for task '${this.transactionId}' was invoked by unexpected caller '${caller}' (expected: ${this.expectedCallers.join(', ')})`
        )
      );

      return false;
    }

    // Reject the promise if the caller sent an error -> Fail the task
    if (error) {
      reject(
        new Error(
          `Callback for task '${this.transactionId}' was invoked with an error from '${caller}': ${error}`
        )
      );

      return true;
    }

    resolve(caller);
    return true;
  }

  async _performHttpDoneCallback() {
    if (!this.httpDoneCallback) {
      return;
    }

    if (!this.isDone()) {
      throw new Error(
        `HTTP callback can only be performed after the task is done (was in state '${this.state}', task '${this.transactionId}')`
      );
    }

    const url = new URL(this.httpDoneCallback);
    url.searchParams.set('status', this.state === TaskState.Done ? 'success' : 'error');

    logger.info(`Performing task done HTTP callback to '${url}' for task '${this.transactionId}'`);

    try {
      const resp = await fetch(url, apiAuthHeader({ method: 'POST' }));

      if (!resp.ok) {
        logger.error(
          `HTTP callback to '${url}' for task '${this.transactionId}' failed (status ${resp.status})`
        );
      }
    } catch (e) {
      logger.error(`HTTP callback to '${url}' for task '${this.transactionId}' failed: %s`, e);
    }
  }
}
