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

  async pullAllBranches() {
    await this.git.fetch(['--all']);

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

  async getAllCommitHashes() {
    const lines = await this.git.raw('rev-list', '--branches');
    return lines.split('\n');
  }

  async getCommitInfoByHash(hash) {
    const result = await this.git.show([hash, '--numstat', '--format=%ae%n%aI']);

    const lines = result.split('\n');

    if(lines.length < 2) {
      throw Error(`Commit show of hash ${hash} is missing header info (author, date)`);
    } 
    
    if(lines.length < 4 || lines[2].length) {
      throw Error(`Commit show of hash ${hash} has invalid diff format`);
    }
    
    const [authorEmail, isoDate] = lines;
    const date = new Date(isoDate);
    if(isNaN(date)) {
      throw Error(`Commit show of hash ${hash} has invalid date format: '${isoDate}'`);
    }

    const fileChanges = [];

    for(let i = 3; i < lines.length; i++) {
      const line = lines[i]; 
      if(!line.length) {
        continue;
      }

      const firstTabPos = line.indexOf('\t') + 1;
      const secondTabPos = line.indexOf('\t', firstTabPos) + 1;
      
      const additionCount = parseInt(line);
      const deletionCount = parseInt(line.substring(firstTabPos));
      const fileName = line.substring(secondTabPos);

      if(isNaN(additionCount) || isNaN(deletionCount)) {
        throw Error(`Commit show of hash ${hash} has invalid diff format: ${line}`);
      }

      fileChanges.push({additionCount, deletionCount, fileName});
    }

    return {hash, authorEmail, isoDate, fileChanges};
  }
}
