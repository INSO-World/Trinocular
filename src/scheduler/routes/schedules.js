
import Joi from 'joi';
import { Scheduler } from '../lib/scheduler.js';


const scheduleValidator= Joi.object({
  uuid: Joi.string().uuid().required(),
  cadence: Joi.number().positive().required(),
  startTime: Joi.string().isoDate().required()
}).unknown(false).required();

export function getSchedules( req, res ) {
  const schedules= Scheduler.the().schedules.map( schedule => ({
    repoUuid: schedule.repoUuid,
    cadence: schedule.cadence,
    state: schedule.runningUpdateTask ? schedule.runningUpdateTask.state : 'waiting'
  }));

  res.send( schedules );
}


export function postSchedule( req, res ) {
  const {value, error}= scheduleValidator.validate( req.body );
  if( error ) {
    console.log(`Post: Got invalid schedule`, error);
    res.status( 422 ).send( error.details || 'Validation error' );
    return;
  }

  const startTime= new Date( value.startTime );
  Scheduler.the().setScheduleForRepository( value.uuid, startTime, Math.round( value.cadence ) );

  // TODO: Persist the schedules

  res.sendStatus( 200 );
}

