import { randomUUID } from 'node:crypto';
import { GitView } from './git-view.js';
import { apiAuthHeader } from '../../common/api.js';

export class Contributor {
  /**
   * @param {string} authorName
   * @param {string} email
   * @param {number} dbId
   * @param {string} uuid
   */
  constructor(authorName, email, dbId, uuid) {
    this.authorName = authorName
    this.email = email;
    this.dbId = dbId;
    this.uuid = uuid;
  }
}

export class Repository {
  /**
   * @param {string} name
   * @param {number} dbId
   * @param {string} uuid
   * @param {string} gitUrl
   * @param {string} type
   * @param {Contributor[]?} contributors
   * @param {string} authToken
   */
  constructor(name, dbId, uuid, gitUrl, type, contributors, authToken) {
    this.name = name;
    this.dbId = dbId;
    this.uuid = uuid;
    this.gitUrl = gitUrl;
    this.type = type; // either 'gitlab' or 'gitlab'
    this.contributors = contributors;
    this.authToken = authToken;

    this.gitView = null;
  }

  /**
   * @returns {Promise<GitView>}
   */
  async loadGitView() {
    if (!this.gitView) {
      this.gitView = new GitView(this);
      await this.gitView.openOrClone();
    }
    return this.gitView;
  }

  /**
   * Adds given contributors to the repository and ensures there are no duplicates
   * @param {Contributor[]} newContributors
   */
  addContributors(newContributors) {
    const contributorMap = new Map();

    this.contributors.forEach(contributor => contributorMap.set(contributor.email, contributor));

    newContributors.forEach(newContributor => {
      if (!contributorMap.has(newContributor.email)) {
        const contributor = new Contributor(newContributor.authorName,newContributor.email, null, randomUUID());
        contributorMap.set(contributor.email, contributor);
      }
    });

    this.contributors = Array.from(contributorMap.values());
  }
}

/**
 *  @type {Map<string,Repository>}
 */
export const repositories = new Map();
