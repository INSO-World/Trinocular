import Joi from 'joi';
import { getScheduleFromSchedulerService, sendScheduleUpdate } from '../../lib/requests.js';
import { getAllRepos } from '../../lib/database.js';
import { logger } from '../../../common/index.js';

const rescheduleInstructionsValidator= Joi.object({
  startTime: Joi.string().required().label('Start Time'),
  timeOffset: Joi.number().integer().min(0).required().label('Time Offset')
})
  .required()
  .unknown(false);

export async function postReschedule(req, res) {
  if (req.csrfError) {
    return res.status(400).send('Invalid CSRF');
  }

  // Validate form data
  const { error, value } = rescheduleInstructionsValidator.validate(req.body);
  if (error) {
    logger.warning(`Post: Got invalid reschedule instructions: %s`, error);
    res.status(422).send(error.details || 'Validation error');
    return;
  }

  const {startTime, timeOffset}= value;

  // Get existing schedule
  const currentSchedules= await getScheduleFromSchedulerService();
  if( currentSchedules.error ) {
    logger.error('Could not lookup current schedule: %s', currentSchedules.error);
    return res.status(500).send('Could not lookup current schedule');
  }

  // Get all active repos (alphabetically ordered by name)
  const activeRepos= getAllRepos(true);

  // Go through the repos alphabetically and try to match it with an existing schedule
  let scheduleTime= new Date(startTime);
  const newSchedules= [];
  for( const { uuid } of activeRepos ) {

    // Try and find an existing schedule, as we do not want to enable automatic
    // snapshots for repos that had it disabled
    const schedule= currentSchedules.find( s => s.repoUuid === uuid );
    if( !schedule ) {
      continue;
    }

    console.log('Updating schedule:', schedule, '->', scheduleTime);

    newSchedules.push({
      uuid,
      startTime: scheduleTime,
      cadence: 24* 60* 60
    });

    scheduleTime = new Date(scheduleTime.getTime()+ timeOffset * 60 * 1000);
  }

  console.log('New schedule', newSchedules);

  logger.info(`Rescheduling repos which updates ${newSchedules.length} schedules`);

  // Send schedule back
  const schedulerUpdateError= await sendScheduleUpdate( newSchedules );
  if( schedulerUpdateError ) {
    logger.error(`Could not update schedules on scheduler service: ${schedulerUpdateError}`);
    return res.status(500).send('Could not persist schedules');
  }

  res.sendStatus(200);
}
