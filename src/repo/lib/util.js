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

/**
 * Processes the provided array in batches. Each batch is mapped into promises,
 * and then `Promise.all()` is called on it. The results are concatenated into
 * a single array.
 * @template T, U
 * @param {T[]} items 
 * @param {number} batchSize 
 * @param {function(T): Promise<U>} mapper 
 * @returns {Promise<U[]>}
 */
export async function batchedPromiseAll(items, batchSize, mapper) {
    let readIdx = 0, writeIdx = 0;
    const batchItems = new Array(batchSize);
    const results = new Array(items.length);
    while (readIdx < items.length) {

      batchItems.length= 0;
      for( let i= 0; i< batchSize && readIdx < items.length; i++ ) {
        batchItems.push( mapper(items[readIdx++]) );
      }

      const batchResult= await Promise.all( batchItems );

      for( let i = 0; i< batchResult.length; i++ ) {
        results[writeIdx++]= batchResult[i];
      }
    }
    return results;
}
