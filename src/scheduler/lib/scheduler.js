import { assert, logger } from '../../common/index.js';
import { TaskState, UpdateTask } from './task.js';
import { formatTimeSpan } from './util.js';

const TICK_INTERVAL = 5000;

export class Schedule {
  /**
   * @param {string} repoUuid
   * @param {Date} startTime
   * @param {number} cadence
   */
  constructor(repoUuid, startTime, cadence) {
    this.repoUuid = repoUuid;
    this.cadence = cadence;
    this.nextRunDate = null;

    this.computeNextRunDate(startTime);

    /** @type {UpdateTask?} */
    this.runningUpdateTask = null;
  }

  /**
   * @param {Date} currentTime
   */
  isReady() {
    return this.nextRunDate <= Date.now() && !this.runningUpdateTask;
  }

  /**
   * Compute the next date and time when the update should run based on the set
   * cadence. As a reference either the last time is used or a provided reference
   * point in the past. If the reference point is in the future it is set as
   * the next run time.
   * @param {Date?} currentDate
   */
  computeNextRunDate(startDate = null) {
    const currentDate = new Date();

    // The start date is in the future -> Schedule the next update for then
    if (startDate && startDate > currentDate) {
      this.nextRunDate = startDate;
      return;
    }

    // Use the start data as the basis for the cadence, else use the last update time
    if (startDate) {
      this.nextRunDate = startDate;
    }

    // Add the cadence intervals until we are in the future
    while (this.nextRunDate < currentDate) {
      this.nextRunDate = new Date(this.nextRunDate.getTime() + 1000 * this.cadence);
    }
  }

  updateTask() {
    assert(!this.runningUpdateTask);

    this.computeNextRunDate();
    this.runningUpdateTask = new UpdateTask(this.repoUuid, this);
    return this.runningUpdateTask;
  }

  secondsUntilRun() {
    // We are already running
    if (this.runningUpdateTask) {
      return 0;
    }

    // Compute time diff in seconds
    return Math.round((this.nextRunDate.getTime() - Date.now()) / 1000);
  }
}

export class Scheduler {
  /** @type {Scheduler} */
  static _instance = null;

  static create() {
    if (!Scheduler._instance) {
      Scheduler._instance = new Scheduler();
      Scheduler._instance.startTimer();
    }
  }

  static the() {
    return Scheduler._instance;
  }

  constructor() {
    /** @type {Schedule[]} */
    this.schedules = [];

    /** @type {UpdateTask[]} */
    this.pendingTasks = [];

    /** @type {Map<string, UpdateTask>} */
    this.runningTasks = new Map();

    /** @type {Set<string>} */
    this.activeRepositories = new Set();

    this.timer = null;
  }

  startTimer() {
    this.stopTimer();
    this.timer = setInterval(() => this._update(), TICK_INTERVAL);
  }

  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * @param {Schedule[]} schedules
   */
  setSchedules(schedules) {
    this.schedules = schedules;
  }

  _scheduleReadyTasks() {
    // Queue the tasks of all schedules that are ready
    for (const schedule of this.schedules) {
      if (schedule.isReady() && !this.activeRepositories.has(schedule.repoUuid)) {
        this.queueTask(schedule.updateTask());
      }
    }
  }

  _runNextPendingTask() {
    // No pending tasks to run
    if (!this.pendingTasks.length) {
      return;
    }

    // Do not run another task while at least one task is currently updating the API
    for (const [id, task] of this.runningTasks) {
      if (task.is(TaskState.UpdatingApiService)) {
        return;
      }
    }

    // Start the next task from the pending queue
    const task = this.pendingTasks.shift();
    this.runningTasks.set(task.transactionId, task);

    logger.info(`Starting task '${task.transactionId}' for '${task.repoUuid}'`);

    task.run();
  }

  _cleanupFinishedTasks() {
    // Remove any tasks that are marked as done (either errored or finished)
    for (const [id, task] of this.runningTasks) {
      if (task.isDone()) {
        logger.info(`Clearing done task '${id}' for '${task.repoUuid}' (state: ${task.state})`);

        this.runningTasks.delete(id);
        this.activeRepositories.delete(task.repoUuid);

        if (task.schedule && task.schedule.runningUpdateTask === task) {
          // TODO: Mark the schedule as failed if the task had an error

          // Detach task from schedule
          task.schedule.runningUpdateTask = null;
        }
      }
    }
  }

  _update() {
    this._scheduleReadyTasks();
    this._runNextPendingTask();
    this._cleanupFinishedTasks();
  }

  setScheduleForRepository(repoUuid, startTime, cadence) {
    // Either create a new schedule object or reuse the repository's existing one
    let schedule = this.schedules.find(schedule => schedule.repoUuid === repoUuid);
    if (schedule) {
      schedule.cadence = cadence;
      schedule.computeNextRunDate(startTime);
    } else {
      schedule = new Schedule(repoUuid, startTime, cadence);
      this.schedules.push(schedule);
    }

    const timeDiff = schedule.secondsUntilRun();
    logger.info(
      `Set schedule for '${repoUuid}' to run in '${formatTimeSpan(timeDiff)}' every '${formatTimeSpan(cadence)}'`
    );
  }

  removeSchedulesForRepository(repoUuid) {
    this.schedules = this.schedules.filter(schedule => schedule.repoUuid !== repoUuid);
  }

  /**
   * @param {UpdateTask} task Task to queue
   * @returns {boolean} Did queue the task
   */
  queueTask(task) {
    if (this.activeRepositories.has(task.repoUuid)) {
      logger.warning(`Ignoring task for '${task.repoUuid}', update already queued or in progress`);
      return false;
    }

    logger.info(`Queueing task '${task.transactionId}' for '${task.repoUuid}'`);
    this.activeRepositories.add(task.repoUuid);
    this.pendingTasks.push(task);
    return true;
  }

  /**
   * Get all currently pending and running tasks
   * @returns {UpdateTask[]}
   */
  getAllTasks() {
    return [...this.pendingTasks, ...this.runningTasks.values()];
  }

  getRunningTask(transactionId) {
    return this.runningTasks.get(transactionId) || null;
  }

  getTask(transactionId) {
    let task = this.getRunningTask(transactionId);
    if (task) {
      return task;
    }

    return this.pendingTasks.find(task => task.transactionId === transactionId) || null;
  }
}
