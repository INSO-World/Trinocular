import fs from 'node:fs/promises';

import simpleGit, { CleanOptions } from 'simple-git';
import { isDirectoryNotEmpty } from './util.js';
import { logger } from '../../common/index.js';

/** @typedef {import('./repository.js').Repository} Repository */
/** @typedef {import('simple-git').SimpleGit} SimpleGit */

export class GitView {
  /**
   * @param {Repository} repo
   */
  constructor(repo) {
    this.repository = repo;

    /** @type {SimpleGit?} */
    this.git = null;
  }

  get authenticatedRemoteUrl() {
    if (!this.repository.authToken) {
      throw new Error('Repository did not load auth token yet. Cannot connect to git.');
    }

    const url = new URL(this.repository.gitUrl);
    url.username = 'dummy';
    url.password = this.repository.authToken;
    return url.href;
  }

  get repoPath() {
    return `/var/repo/${this.repository.uuid}`;
  }

  async openOrClone() {
    const repoExists = await isDirectoryNotEmpty(this.repoPath);
    if (!repoExists) {
      logger.info(
        `Cloning repository '${this.repository.name}' from '${this.repository.gitUrl}' (path ${this.repoPath})`
      );
      this.git = simpleGit();
      await this.git.clone(this.authenticatedRemoteUrl, this.repoPath);
      logger.info(`Done cloning repository '${this.repository.name}'`);
    }

    this.git = simpleGit({ baseDir: this.repoPath, trimmed: true });
  }

  async removeLocalFiles() {
    await fs.rm(this.repoPath, { recursive: true, force: true });
  }

  async hasAnyCommits() {
    // Check that there is at least one commit, else eg. 'git shortlog' hangs waiting for stdin input
    const commitText= await this.git.raw('rev-list', '-n', '1', '--all');
    return commitText.trim();
  }

  /**
   * Get a list of all remote branches of the repository (excluding local versions)
   */
  async getAllBranches() {
    await this.git.fetch(['--all', '--prune']);
    const branchList = await this.git.branch(['-r']);
    return branchList.all;
  }

  async pullAllBranches() {
    const branchList = await this.getAllBranches();

    // Pull each branch
    for (const remoteName of branchList) {
      // Ignore anything (refs) that is not a remote branch
      const remotePrefix = 'origin/';
      if (!remoteName.startsWith(remotePrefix)) {
        continue;
      }

      await this.git.clean(CleanOptions.FORCE + CleanOptions.RECURSIVE);

      // Check out the branch with its local name and clean out any unwanted
      // local changes before pulling/merging
      const name = remoteName.substring(remotePrefix.length);
      await this.git.checkout(name);
      await this.git.reset('hard', [remoteName]);

      // If the branch is deleted on the remote between calling fetch and now when
      // we want to pull it, we might encounter an error here
      try {
        await this.git.pull(['--ff-only']);
      } catch( e ) {
        logger.error(`Could not pull branch '${name}': %s`, e);
      }
    }
  }

  /**
   * @returns {Promise<string[]>}
   */
  async getCommitHashesOfBranch(branchName) {
    const lines = await this.git.raw('rev-list', branchName);
    return lines.split('\n');
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
    const result = await this.git.show([hash, '--numstat', '--format=%ae%n%aI%n%p']);
    const lines = result.split('\n');

    if (lines.length < 2) {
      throw Error(`Commit show of hash ${hash} is missing header info (author, date)`);
    }

    if (lines.length < 4 || lines[3].length) {
      throw Error(`Commit show of hash ${hash} has invalid diff format`);
    }

    // Extract and parse author, date and parent hashes from the first three lines as set by the '--format'
    const [authorEmail, isoDate, parentHashLine] = lines;
    const date = new Date(isoDate);
    if (isNaN(date)) {
      throw Error(`Commit show of hash ${hash} has invalid date format: '${isoDate}'`);
    }

    const parentHashes = parentHashLine.split(' ');
    const isMergeCommit = parentHashes.length > 1;

    const fileChanges = [];

    // Parse each of the file stats lines which follow the form:
    // <num>\t<num>\t<filename>
    for (let i = 4; i < lines.length; i++) {
      const line = lines[i];
      if (!line.length) {
        continue;
      }

      // Split the line on the tab characters
      const firstTabPos = line.indexOf('\t') + 1;
      const secondTabPos = line.indexOf('\t', firstTabPos) + 1;

      const additionString = line.substring(0, firstTabPos);
      const deletionString = line.substring(firstTabPos, secondTabPos);
      const fileName = line.substring(secondTabPos);

      // No diff information is generated for binary files, instead '- -' is printed
      const isBinaryFile = additionString.trim() === '-' && deletionString.trim() === '-';

      const additionCount = isBinaryFile ? 0 : parseInt(additionString);
      const deletionCount = isBinaryFile ? 0 : parseInt(deletionString);

      if (isNaN(additionCount) || isNaN(deletionCount) || firstTabPos >= secondTabPos) {
        throw Error(`Commit show of hash ${hash} has invalid diff format: ${line}`);
      }

      fileChanges.push({
        additionCount,
        deletionCount,
        fileName,
        isBinaryFile
      });
    }

    return { hash, authorEmail, isoDate, isMergeCommit, fileChanges };
  }

  async getAllContributors() {
    const lines = await this.git.raw('shortlog', '--all', '-se');

    // Get author name and email from string with following format: "1  Author Name <author@student.tuwien.ac.at>"
    return lines
      .split('\n')
      .map(line => {
        const match = line.trim().match(/^\d+\s+(.+)\s+<(.+)>$/);
        if (!match) return null; // Skip invalid lines
        return {
          authorName: match[1],
          email: match[2]
        };
      })
      .filter(Boolean);
  }
}
