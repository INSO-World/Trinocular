import { apiAuthHeader } from './api.js';


/**
 * Send a callback to the scheduler service, when we are done with performing a 
 * snapshot.
 * @param {string} transactionId 
 * @param {'ok' | 'error'} status
 */
export async function sendSchedulerCallback( transactionId, status ) {
  const resp= await fetch(
    `http://${process.env.SCHEDULER_NAME}/task/${transactionId}/callback/${process.env.SERVICE_NAME}?status=${status}`,
    apiAuthHeader({method: 'POST'})
  );

  if( !resp.ok ) {
    console.error(`Scheduler callback did not respond OK (status ${resp.status})`);
    return false;
  }

  return true;
}
