import { assert } from '../../common/index.js';

/**
 * @type {Map<string, string>}
 */
const uuidToTransactionId = new Map();

/**
 * Set whether a repository is currently being imported, and should hence not
 * be accessed. Routes for web pages should then redirect to the waiting page
 * in this case.
 * @param {string} uuid Repository UUID to set the flag for
 * @param {boolean} isImporting
 * @param {string} transactionId ID of the transaction to wait for. Required, when
 *                  the flag is set to `true`
 */
export function setRepositoryImportingStatus(uuid, isImporting, transactionId) {
  if (isImporting) {
    assert(transactionId, 'An transaction ID is required when marking a repository as importing');
    uuidToTransactionId.set(uuid, transactionId);
  } else {
    uuidToTransactionId.delete(uuid);
  }
}

/**
 * Checks whether a repository is marked as currently importing
 * @param {string} uuid
 * @returns {boolean}
 */
export function repositoryIsCurrentlyImporting(uuid) {
  return uuidToTransactionId.has(uuid);
}

/**
 * Returns the transaction ID of the task to wait for, if the repository is marked
 * as currently importing
 * @param {string} uuid
 * @returns {string?}
 */
export function transactionToWaitFor(uuid) {
  return uuidToTransactionId.get(uuid) || null;
}
