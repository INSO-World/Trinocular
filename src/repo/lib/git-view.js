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

    // Get all available remote branches (exclude the local versions of the
    // branches to prevent duplicates in the list)
    const branchSummary= (await this.git.branch(['-r']));

    // Pull each branch
    for( const remoteName of branchSummary.all ) {
      // Ignore anything (refs) that is not a remote branch
      const remotePrefix= 'origin/';
      if( !remoteName.startsWith(remotePrefix) ) {
        continue;
      }

      // Check out the branch with its local name and clean out any unwanted
      // local changes before pulling/merging
      const name= remoteName.substring(remotePrefix.length);
      await this.git.checkout( name );
      await this.git.reset('hard');
      await this.git.pull();
    }
  }

  /**
   * @returns {Promise<string[]>}
   */
  async getAllCommitHashes() {
    const lines = await this.git.raw('rev-list', '--branches');
    return lines.split('\n');
  }

  /**
   * @param {string} hash 
   */
  async getCommitInfoByHash(hash) {
    // Get the author email, author date and file change stats as separate lines
    // TODO: Add %P parent hashes to detect merge commits?
    const result = await this.git.show([hash, '--numstat', '--format=%ae%n%aI']);
    const lines = result.split('\n');

    if(lines.length < 2) {
      throw Error(`Commit show of hash ${hash} is missing header info (author, date)`);
    } 
    
    if(lines.length < 4 || lines[2].length) {
      throw Error(`Commit show of hash ${hash} has invalid diff format`);
    }
    
    // Extract and parse auther and date from the first two lines as set by the '--format'
    const [authorEmail, isoDate] = lines;
    const date = new Date(isoDate);
    if(isNaN(date)) {
      throw Error(`Commit show of hash ${hash} has invalid date format: '${isoDate}'`);
    }

    const fileChanges = [];

    // Parse each of the file stats lines which follow the form:
    // <num>\t<num>\t<filename>
    for(let i = 3; i < lines.length; i++) {
      const line = lines[i]; 
      if(!line.length) {
        continue;
      }

      // Split the line on the tab characters
      const firstTabPos = line.indexOf('\t') + 1;
      const secondTabPos = line.indexOf('\t', firstTabPos) + 1;
      
      const additionString = line.substring(0, firstTabPos);
      const deletionString = line.substring(firstTabPos, secondTabPos);
      const fileName = line.substring(secondTabPos);

      // No diff information is generated for binary files, instead '- -' is printed
      const isBinaryFile= additionString.trim() === '-' && deletionString.trim() === '-';

      const additionCount= isBinaryFile ? 0 : parseInt(additionString);
      const deletionCount= isBinaryFile ? 0 : parseInt(deletionString);

      if(isNaN(additionCount) || isNaN(deletionCount)) {
        throw Error(`Commit show of hash ${hash} has invalid diff format: ${line}`);
      }

      fileChanges.push({additionCount, deletionCount, fileName, isBinaryFile});
    }

    return {hash, authorEmail, isoDate, fileChanges};
  }
}
