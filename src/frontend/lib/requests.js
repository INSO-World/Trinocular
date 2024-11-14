import { apiAuthHeader } from '../../common/index.js';

/**
 * @param {string} transactionId 
 * @returns {Object?}
 */
export async function getTaskStatus( transactionId ) {
  try {
    const resp= await fetch(`http://${process.env.SCHEDULER_NAME}/task/${transactionId}`, apiAuthHeader());

    if( !resp.ok ) {
      console.error(`Could not get status of task '${transactionId}' (status ${resp.status})`);
      return null;
    }

    return await resp.json();

  } catch( e ) {
    console.error(`Could not get status of task '${transactionId}':`, e);
    return null;
  }
}

/**
 * @param {string} uuid Repository UUID
 * @param {string?} doneCallback 
 */
export async function submitSchedulerTask(uuid, doneCallback= undefined) {
  try {
    const resp= await fetch(`http://${process.env.SCHEDULER_NAME}/task`, apiAuthHeader({
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({uuid, doneCallback})
    }));

    if( !resp.ok ) {
      return null;
    }

    const data= await resp.json();

    if( !data || !data.transactionId ) {
      console.error(`Scheduler sent invalid response when submitting task for repository '${uuid}': ${JSON.stringify(data)}`);
      return null;
    }

    return data.transactionId;

  } catch( e ) {
    console.error(`Could not submit task to scheduler to update repository '${uuid}'`);
    return null;
  }
}
