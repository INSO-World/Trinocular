import { assert, logger, PromiseMemcached } from '../../common/index.js';

/** @type {PromiseMemcached?} */
export let memcachedInstance= null;

export function initMemcached(hosts, options) {
  assert( !memcachedInstance, 'Memcached instance already initialized');

  memcachedInstance= new PromiseMemcached(hosts, options);
}

/**
 * Try to get the importing state of a repository. If there is no state
 * information available null is returned.
 * @param {string} repoUuid 
 * @returns {Promise<Object?>}
 */
export async function repositoryImportingState( repoUuid ) {
  assert(memcachedInstance, 'Memcached was not initialized');

  try {
    const repoKey= `scheduler-repo-${repoUuid}`;

    // NOTE: In the future we might want to extend the lifetime of checked keys
    // in addition to just reading them. This way only state keys get evicted
    // that have not been used for some time and still relevant ones remain.

    // Try to get the state key associated with the repository. If there
    // is no entry we cannot check the status and return null.
    const stateKey= await memcachedInstance.get(repoKey);
    if( !stateKey ) {
      return null;
    }

    // No state to check as well
    const stateJson= await memcachedInstance.get( stateKey );
    if( !stateJson ) {
      return null;
    }

    return JSON.parse( stateJson );

  } catch( e ) {
    logger.error('Could not lookup repository importing status: %s', e);
    return null;
  }
}

/**
 * Checks whether a provided importing state object indicates that the repository
 * is currently in the process of being imported.
 * @param {*} state 
 * @returns {boolean}
 */
export function repositoryImportingStateIsActive( state ) {
  return !!state && state.state !== 'error' && state.state !== 'done';
}

/**
 * Checks whether a provided importing state object indicates that the repository
 * import has failed with an error
 * @param {*} state 
 * @returns {boolean}
 */
export function repositoryImportingStateIsError( state ) {
  return !!state && state.state === 'error';
}

/**
 * Queries memcached whether a repo is currently being imported by a
 * scheduler task
 * @param {string} repoUuid 
 * @returns {Promise<boolean>} Whether the repository is being imported right now
 */
export async function repositoryIsCurrentlyImporting( repoUuid ) {
  assert(memcachedInstance, 'Memcached was not initialized');

  const state= await repositoryImportingState( repoUuid );
  return repositoryImportingStateIsActive( state );
}
