import Joi from 'joi';
import { Scheduler } from '../lib/scheduler.js';
import { storeSchedules } from '../lib/persistence.js';

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

export async function postSchedule(req, res) {
  const { value, error } = scheduleValidator.validate(req.body);
  if (error) {
    console.log(`Post: Got invalid schedule`, error);
    res.status(422).send(error.details || 'Validation error');
    return;
  }

  const startTime = new Date(value.startTime);
  Scheduler.the().setScheduleForRepository(value.uuid, startTime, Math.round(value.cadence));

  await storeSchedules(Scheduler.the().schedules);

  res.sendStatus(200);
}

/**
 * Delete all schedules that are associated with the given repository uuid
 */
export async function deleteSchedule(req, res) {
  const { uuid } = req.params;

  console.log(`Deleting repository with uuid ${uuid}`);

  Scheduler.the().removeSchedulesForRepository(uuid);

  await storeSchedules(Scheduler.the().schedules);

  res.sendStatus(204);
}
