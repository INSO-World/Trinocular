import fs from 'node:fs/promises';

export async function isDirectoryNotEmpty(directoryPath) {
  try {
    // Check if path points to directory
    const stat = await fs.stat(directoryPath);
    if (!stat.isDirectory()) {
      return false;
    }

    // Check if not empty
    const files = await fs.readdir(directoryPath);
    return files.length > 0;
  } catch (err) {
    return false;
  }
}


export class Counter {
  constructor() {
    this.value= 0;
  }
  
  inc() {
    return ++this.value;
  }
}


const AlreadyFulfilledPromise= Symbol('AlreadyFulfilledPromise');

/**
 * Processes the provided array in batches. Each batch is mapped into promises,
 * and then `Promise.allSettled()` is called on it. The results are concatenated
 * into a single array. Any task that produced an error is retried up to the
 * set number of retries.
 * @template T, U
 * @param {T[]} items 
 * @param {number} batchSize 
 * @param {number} maxRetries 
 * @param {function(T): Promise<U>} mapper 
 * @param {Counter?} retryCounter 
 * @returns {Promise<U[]>}
 */
export async function batchedPromiseAllSettled(items, batchSize, maxRetries, mapper, retryCounter) {
    let batchIdx = 0;
    /** @type {(Promise<U> | typeof AlreadyFulfilledPromise)[]} */
    const batchItems = new Array(batchSize);
    const results = new Array(items.length);

    // Go through the input items one batch a time
    while (batchIdx < items.length) {

      // Fill the next batch with tasks using the mapper function
      batchItems.length= Math.min( batchSize, items.length- batchIdx );
      for( let i= 0; i< batchItems.length; i++ ) {
        batchItems[i]= mapper(items[batchIdx+ i]);
      }

      // We can retry tasks within this batch multiple times
      let retries= 0;
      retryLoop: while( true ) {
        // Execute the batch and await the result
        const batchResult= await Promise.allSettled( batchItems );

        // Copy task results into results array
        let error= null;
        for( let i = 0; i< batchResult.length; i++ ) {
          // Ignore placeholder values from previous attempts, so we do not override our results
          const result= batchResult[i];
          if( result.status === 'fulfilled' && result.value !== AlreadyFulfilledPromise ) {
            results[batchIdx+ i]= result.value;

          // Keep track of the last error
          } else if( result.status === 'rejected' ) {
            error= result.reason;
          }
        }

        // No error -> no retry needed
        if( !error ) {
          break retryLoop;
        }

        // Count the total number of retries across all batches
        retryCounter?.inc();

        // After retry attempts are exhausted we propagate the error
        if( retries++ >= maxRetries ) {
          throw error;
        }

        // Repopulate the batch with tasks that need to be rerun/retried and placeholder
        // values. If the task has already succeeded we insert the placeholder value. We
        // fill the whole batch to keep relative positions and make it possible to insert
        // results at the right location in the results array.
        for( let i= 0; i< batchResult.length; i++ ) {
          if( batchResult[i].status === 'rejected' ) {
            batchItems[i]= mapper(items[batchIdx+ i]);
          } else {
            batchItems[i]= AlreadyFulfilledPromise;
          }
        }
      }

      // Move to the next batch
      batchIdx+= batchSize;
    }
    return results;
}
