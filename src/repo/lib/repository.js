import { randomUUID } from 'node:crypto';
import { GitView } from './git-view.js';
import { apiAuthHeader } from '../../common/api.js';



export class Contributor {
  /**
   * @param {string} email
   * @param {number} dbId
   * @param {string} uuid
   */
  constructor(email, dbId, uuid) {
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
   * @param {string?} authToken
   */
  constructor(name, dbId, uuid, gitUrl, type, contributors, authToken = null) {
    this.name = name;
    this.dbId = dbId;
    this.uuid = uuid;
    this.gitUrl = gitUrl;
    this.type = type; // either 'gitlab' or 'gitlab'
    this.contributors = contributors;
    this.authToken = authToken;

    this.gitView = null;
  }

  // TODO: Remove after receiving token from frontend
  async _loadAuthToken() {
    // fetch auth token from API-bridge
    const resp = await fetch(
      `http://api-bridge/repository/${this.uuid}`,
      apiAuthHeader({ method: 'GET' })
    );

    if (!resp || !resp.ok) {
      throw Error(`Api-Bridge did not return a repository with uuid: ${this.uuid}`);
    }

    const respData= await resp.json();

    this.authToken = respData.authToken;
  }

  /**
   * @returns {Promise<GitView>}
   */
  async loadGitView() {
    if (!this.gitView) {
      await this._loadAuthToken();
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

    newContributors.forEach(contributorEmail => {
      if (!contributorMap.has(contributorEmail)) {
        const contributor = new Contributor(contributorEmail, null, randomUUID());
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
