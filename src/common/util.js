

/**
 * @param {number} ms Time to wait in ms
 * @param {AbortSignal?} signal Early stop waiting via abort controller
 * @returns {Promise<void>}
 */
export async function waitFor( ms, signal= null ) {
  return new Promise( (res, rej) => {
    // Do not start waiting if we got an already aborted signal
    if( signal && signal.aborted ) {
      return rej( signal.reason );
    }

    // Resolve after waiting
    const timeout= setTimeout( res, ms );

    // Listen for abort signal -> Stop waiting and reject
    if( signal ) {
      signal.addEventListener('abort', () => {
        clearTimeout( timeout );
        rej( signal.reason );
      });
    }
  });
}
