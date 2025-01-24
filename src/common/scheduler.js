import { apiAuthHeader } from './api.js';
import { loggerOrConsole } from './logger.js';

/**
 * Send a callback to the scheduler service, when we are done with performing a
 * snapshot.
 * @param {string} transactionId
 * @param {'ok' | 'error'} status
 */
export async function sendSchedulerCallback(transactionId, status, message = null) {
  const logger= loggerOrConsole();

  const url = new URL(
    `http://${process.env.SCHEDULER_NAME}/task/${transactionId}/callback/${process.env.SERVICE_NAME}`
  );

  url.searchParams.set('status', status);
  if (message) {
    url.searchParams.set('message', message);
  }

  const resp = await fetch(url, apiAuthHeader({ method: 'POST' }));

  if (!resp.ok) {
    logger.error(`Scheduler callback did not respond OK (status ${resp.status})`);
    return false;
  }

  return true;
}

/**
 * A version of the method that swallows all errors.
 * @param {string} transactionId
 * @param {'ok' | 'error'} status
 */
async function sendSchedulerCallbackSilently(transactionId, status, message = null) {
  const logger= loggerOrConsole();

  try {
    const success= await sendSchedulerCallback( transactionId, status, message );
    if(!success) {
      throw Error('Scheduler callback failed with bad status code');
    }
  } catch( e ) {
    logger.error(`Could not perform scheduler callback: %s`, e);
  }
}

/**
 * @param {Error} error Error instance to format
 * @returns {string}
 */
function formatRecursiveErrorMessage( error ) {
  if( !error ) {
    return '<empty error message>';
  }

  let messageString= '';
  while( error ) {
    if( messageString.length ) {
      messageString+= '\n -> ';
    }

    if( error instanceof Error ) {
      messageString+= `${error.name}: ${error.message}`;
    } else if( typeof error === 'string' ) {
      messageString+= error;
    }

    error= error.cause;
  }

  return messageString;
}

export async function withSchedulerCallback( transactionId, func, errorTransformer= null ) {
  const logger= loggerOrConsole();
  let caughtError= null;

  try {
    // Try run the wrapped function
    await func();

  } catch( e ) {
    // Possibly transform the error and store it
    if( errorTransformer ) {
      caughtError= errorTransformer( e );
    }

    if( !caughtError || !(caughtError instanceof Error) ) {
      caughtError= e;
    }

    logger.error('%s', caughtError);

  } finally {
    // Ensure the scheduler callback is performed
    if( caughtError ) {
      const message= formatRecursiveErrorMessage( error );
      await sendSchedulerCallbackSilently( transactionId, 'error', message );

    } else {
      await sendSchedulerCallbackSilently( transactionId, 'ok' );
    }
  }
}
