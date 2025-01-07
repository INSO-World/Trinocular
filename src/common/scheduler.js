import { apiAuthHeader } from './api.js';

/**
 * Send a callback to the scheduler service, when we are done with performing a
 * snapshot.
 * @param {string} transactionId
 * @param {'ok' | 'error'} status
 */
export async function sendSchedulerCallback(transactionId, status, message = null) {
  const url = new URL(
    `http://${process.env.SCHEDULER_NAME}/task/${transactionId}/callback/${process.env.SERVICE_NAME}`
  );

  url.searchParams.set('status', status);
  if (message) {
    url.searchParams.set('message', message);
  }

  const resp = await fetch(url, apiAuthHeader({ method: 'POST' }));

  if (!resp.ok) {
    console.error(`Scheduler callback did not respond OK (status ${resp.status})`);
    return false;
  }

  return true;
}
