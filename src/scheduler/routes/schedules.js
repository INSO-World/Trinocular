import Joi from 'joi';
import { Scheduler } from '../lib/scheduler.js';
import { storeSchedules } from '../lib/persistence.js';
import { logger } from '../../common/index.js';

/**
 * cadence should be given in seconds
 */
const scheduleValidator = Joi.object({
  uuid: Joi.string().uuid().required(),
  cadence: Joi.number().positive().required(),
  startTime: Joi.string().isoDate().required()
})
  .unknown(false)
  .required();

export function getSchedules(req, res) {
  const schedules = Scheduler.the().schedules.map(schedule => ({
    repoUuid: schedule.repoUuid,
    cadence: schedule.cadence,
    state: schedule.runningUpdateTask ? schedule.runningUpdateTask.state : 'waiting'
  }));

  res.send(schedules);
}

export function getScheduleByUuid(req, res) {
  const { uuid } = req.params;

  const schedule = Scheduler.the()
    .schedules.filter(schedule => schedule.repoUuid === uuid)
    .map(schedule => ({
      repoUuid: schedule.repoUuid,
      cadence: schedule.cadence,
      startDate: schedule.nextRunDate
    }));
  if (schedule.length === 0) {
    res.sendStatus(404);
    return;
  }
  res.send(schedule[0]);
}

export async function createOrUpdateSchedule(req, res) {
  const { uuid } = req.params;
  req.body.uuid = uuid;
  const { value, error } = scheduleValidator.validate(req.body);
  if (error) {
    logger.warning(`Post: Got invalid schedule %s`, error);
    res.status(422).send(error.details || 'Validation error');
    return;
  }

  const startTime = new Date(value.startTime);
  Scheduler.the().setScheduleForRepository(value.uuid, startTime, Math.round(value.cadence));

  await storeSchedules(Scheduler.the().schedules);

  logger.info(`Created/Updated repository schedule '${value.uuid}'`);

  res.sendStatus(200);
}

/**
 * Delete all schedules that are associated with the given repository uuid
 */
export async function deleteSchedule(req, res) {
  const { uuid } = req.params;

  logger.info(`Deleting repository with uuid ${uuid}`);

  Scheduler.the().removeSchedulesForRepository(uuid);

  await storeSchedules(Scheduler.the().schedules);

  res.sendStatus(204);
}
