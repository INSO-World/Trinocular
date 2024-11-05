
/** @typedef {import('./repository.js').Repository} Repository */

import simpleGit from 'simple-git';
import { isDirectoryNotEmpty } from './util.js';


export class GitView {
  /**
   * @param {Repository} repo 
   */
  constructor( repo ) {
    this.repository= repo;
    this.git= simpleGit( this.repoPath );
  }

  get authenticatedRemoteUrl() {
    if( !this.repository.authToken ) {
      throw new Error('Repository did not load auth token yet. Cannot connect to git.');
    }

  }

  get repoPath() {
    return `/var/repo/${this.repository.uuid}`;
  }

  async clone() {
  }
}
