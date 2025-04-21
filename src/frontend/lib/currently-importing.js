import { assert, logger, PromiseMemcached } from '../../common/index.js';

/** @type {PromiseMemcached?} */
export let memcachedInstance= null;

export function initMemcached(hosts, options) {
  assert( !memcachedInstance, 'Memcached instance already initialized');

  memcachedInstance= new PromiseMemcached(hosts, options);
}

/**
 * Helper class that lets rout handlers query various things of a repository's
 * importing state
 */
class RepositoryImportingState {
  constructor( state= null ) {
    this.state= state;
  }

  isEmpty() {
    return !this.state;
  }

  isActive() {
    return !!this.state && this.state.state !== 'error' && this.state.state !== 'done';
  }

  isError() {
    return !!this.state && this.state.state === 'error';
  }

  wasScheduled() {
    return !!(this.state?.schedule || null);
  }

  isInitialImportError() {
    return this.isError() && !this.wasScheduled();
  }

  get errorMessage() {
    return this.state?.error || null;
  }
}

/**
 * Try to get the importing state of a repository. If there is no state
 * information available null is returned.
 * @param {string} repoUuid 
 * @returns {Promise<RepositoryImportingState>}
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
      return new RepositoryImportingState();
    }

    // No state to check as well
    const stateJson= await memcachedInstance.get( stateKey );
    if( !stateJson ) {
      return new RepositoryImportingState();
    }

    return new RepositoryImportingState( JSON.parse( stateJson ) );

  } catch( e ) {
    logger.error('Could not lookup repository importing status: %s', e);
    return new RepositoryImportingState();
  }
}
