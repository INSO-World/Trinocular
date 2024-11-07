import Joi from 'joi';
import { Scheduler } from '../lib/scheduler.js';
import { UpdateTask } from '../lib/task.js';

const taskValidator= Joi.object({
  uuid: Joi.string().uuid().required()
}).required();


export function getTasks( req, res ) {
  const tasks= Scheduler.the().getAllTasks().map( task => ({
    repoUuid: task.repoUuid,
    schedule: task.schedule ? {
      cadance: schedule.cadance
    } : null,
    state: task.state
  }));

  res.send( tasks );
}


export function postTask( req, res ) {
  const {value, error}= taskValidator.validate( req.body );
  if( error ) {
    console.log(`Post: Got invalid task to run`, error);
    res.status( 422 ).send( error.details || 'Validation error' );
    return;
  }

  const task= new UpdateTask( value.uuid, null );
  Scheduler.the().queueTask( task );

  res.sendStatus( 200 );
}


export function postTaskCallback( req, res ) {
  const {transactionId, caller}= req.params;

  const task= Scheduler.the().getRunningTask( transactionId );
  if( !task ) {
    console.log(`Post: Got callback to unknown task transaction id '${transactionId}'`);
    res.sendStatus( 404 );
    return;
  }

  const success= task.callback( caller );
  res.sendStatus( success ? 200 : 400 );
}
