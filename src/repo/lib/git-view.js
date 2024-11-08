import fs from 'node:fs/promises';

import simpleGit from 'simple-git';
import { isDirectoryNotEmpty } from './util.js';

/** @typedef {import('./repository.js').Repository} Repository */
/** @typedef {import('simple-git').SimpleGit} SimpleGit */

export class GitView {
  /**
   * @param {Repository} repo 
   */
  constructor( repo ) {
    this.repository= repo;

    /** @type {SimpleGit?} */
    this.git= null;
  }

  get authenticatedRemoteUrl() {
    if( !this.repository.authToken ) {
      throw new Error('Repository did not load auth token yet. Cannot connect to git.');
    }

    const url= new URL( this.repository.gitUrl );
    url.username= 'dummy';
    url.password= this.repository.authToken;
    return url.href;
  }

  get repoPath() {
    return `/var/repo/${this.repository.uuid}`;
  }

  async openOrClone() {
    const repoExists= await isDirectoryNotEmpty(this.repoPath);
    if( !repoExists ) {
      console.log(`Cloning repository '${this.repository.name}' from '${this.repository.gitUrl}' (path ${this.repoPath})`);
      this.git = simpleGit();
      await this.git.clone( this.authenticatedRemoteUrl, this.repoPath );
      console.log(`Done cloning repository '${this.repository.name}'`);
    }

    this.git= simpleGit({ baseDir: this.repoPath, trimmed: true });
  }

  async pull() {
    await this.git.fetch();

    const branchSummary= (await this.git.branch(['-r']));

    for( const remoteName of branchSummary.all ) {
      const remotePrefix= 'origin/';
      if( !remoteName.startsWith(remotePrefix) ) {
        continue;
      }

      const name= remoteName.substring(remotePrefix.length);
      await this.git.checkout( name );
      await this.git.reset('hard');
      await this.git.pull();
    }
  }
}
