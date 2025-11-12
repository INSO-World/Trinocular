import { randomUUID } from 'crypto';
import { visualizationHostnames } from './visualizations.js';
import { apiAuthHeader, logger } from '../../common/index.js';
import { memcachedInstance as memcached } from './memcached-connection.js';
import { ResponseQueue } from './responseQueue.js';

/** @typedef {import('./scheduler.js').Schedule} Schedule*/

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

    const taskCallbackTimeout= 1000 * parseInt(process.env.TASK_CALLBACK_TIMEOUT)
    this.responseQueue= new ResponseQueue( taskCallbackTimeout );

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

  async _sendSnapshotRequestAndWait(hostname, newState) {
    logger.info(`Sending snapshot request to '${hostname}'`);

    this.responseQueue.expectResponses( hostname );

    await this._setAndDistributeState( newState );

    const response = await fetch(
      `http://${hostname}/snapshot/${this.repoUuid}?transactionId=${this.transactionId}`,
      apiAuthHeader({ method: 'POST' })
    );

    if (!response.ok) {
      throw Error(`${hostname} did not respond OK (status: ${response.status})`);
    }

    await this.responseQueue.waitForExpectedResponses();
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
      await this._sendSnapshotRequestAndWait(process.env.API_BRIDGE_NAME, TaskState.UpdatingApiService);

      // 2. Send request to repo-service
      logger.info(
        `[2/3] Sending snapshot request to repo service (transactionId '${this.transactionId}')`
      );
      await this._sendSnapshotRequestAndWait(process.env.REPO_NAME, TaskState.UpdatingRepoService);

      // 3. Send request to registry
      logger.info(
        `[3/3] Sending snapshot request to visualization group on registry (${visualizationHostnames.size} services, transactionId '${this.transactionId}')`
      );

      // Wait for all registered visualization services to respond
      const services = [...visualizationHostnames.keys()];
      this.visualizationServiceCount = services.length;
      this.responseQueue.onResponse= () => {
        this.visualizationServiceCounter++;
        this._setAndDistributeState( this.state );
      };
      this.responseQueue.expectResponses( services );

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

      await this.responseQueue.waitForExpectedResponses();

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
   * Callback invoked by services informing the task that they have finished updating themselves.
   * @param {string} caller
   * @param {string?} error Setting this error fails the task with the provided message
   * @returns {boolean} success
   */
  callback(caller, error = null) {
    if (typeof caller !== 'string') {
      logger.error(`Invalid caller value '${caller}'`);
      return false;
    }

    caller = caller.trim().toLowerCase();
    const wasExpected= this.responseQueue.deliverResponse( caller, error );
    if ( !wasExpected ) {
      logger.warning(`Task '${this.transactionId}' received unexpected callback from '${caller}'`);
      return false;
    }

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
