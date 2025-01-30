import Joi from 'joi';
import { Scheduler } from '../lib/scheduler.js';
import { UpdateTask } from '../lib/task.js';
import { logger } from '../../common/index.js';

const taskValidator = Joi.object({
  uuid: Joi.string().uuid().required(),
  doneCallback: Joi.string().uri()
}).required();

/**
 * @param {UpdateTask} task
 */
function serializeTask(task) {
  return {
    transactionId: task.transactionId,
    repoUuid: task.repoUuid,
    schedule: task.schedule
      ? {
          cadence: task.schedule.cadence
        }
      : null,
    state: task.state,
    visualizationProgress: task.visualizationProgress()
  };
}

export function getTasks(req, res) {
  const tasks = Scheduler.the().getAllTasks().map(serializeTask);
  res.send(tasks);
}

export function getTaskByTransaction(req, res) {
  const { transactionId } = req.params;
  const task = Scheduler.the().getTask(transactionId);
  if (!task) {
    return res.sendStatus(404);
  }

  res.send(serializeTask(task));
}

export function postTask(req, res) {
  const { value, error } = taskValidator.validate(req.body);
  if (error) {
    logger.warning(`Post: Got invalid task to run: %s`, error);
    res.status(422).send(error.details || 'Validation error');
    return;
  }

  const task = new UpdateTask(value.uuid, null, value.doneCallback);
  const didQueue = Scheduler.the().queueTask(task);

  if (!didQueue) {
    return res
      .status(409)
      .end(`Update for repository '${value.uuid}' already queued or in progress`);
  }

  res.json({ transactionId: task.transactionId });
}

export function postTaskCallback(req, res) {
  const { transactionId, caller } = req.params;
  const { status, message } = req.query;

  const task = Scheduler.the().getRunningTask(transactionId);
  if (!task) {
    logger.warning(`Post: Got callback to unknown task transaction id '${transactionId}'`);
    res.sendStatus(404);
    return;
  }

  if (!status || status.toLowerCase() === 'ok') {
    const success = task.callback(caller);
    res.sendStatus(success ? 200 : 400);
  } else if (status.toLowerCase() === 'error') {
    const success = task.callback(caller, message || '<no message provided>');
    res.sendStatus(success ? 200 : 400);
  } else {
    logger.warning(
      `Received invalid status '${status}' from '${caller}' (transaction '${transactionId}')`
    );
    res.status(400).end(`Invalid callback status '${status}'`);
  }
}
