import { randomUUID } from 'node:crypto';
import { GitView } from './git-view.js';

export class Contributor {
  /**
   * @param {string} email
   * @param {number} dbId
   * @param {string} uuid
   * @param {Member?} member
   */
  constructor(email, dbId, uuid, member) {
    this.email = email;
    this.dbId = dbId;
    this.uuid = uuid;
    this.member = member;
  }
}

export class Member {
  /**
   * @param {string} username
   * @param {number} dbId
   * @param {string} uuid
   * @param {number} gitlabId
   * @param {string} name
   * @param {string?} email
   */
  constructor(username, dbId, uuid, gitlabId, name, email) {
    this.username = username;
    this.dbId = dbId;
    this.uuid = uuid;
    this.gitlabId = gitlabId;
    this.name = name;
    this.email = email;
  }
}

export class Repository {
  /**
   * @param {string} name
   * @param {number} dbId
   * @param {string} uuid
   * @param {string} gitUrl
   * @param {string} type
   * @param {Member[]?} members
   * @param {Contributor[]?} contributors
   * @param {string?} authToken
   */
  constructor(name, dbId, uuid, gitUrl, type, members, contributors, authToken = null) {
    this.name = name;
    this.dbId = dbId;
    this.uuid = uuid;
    this.gitUrl = gitUrl;
    this.type = type; // either 'gitlab' or 'gitlab'
    this.members = members;
    this.contributors = contributors;
    this.authToken = authToken;

    this.gitView = null;
  }

  // TODO: Implement functionality
  async _loadAuthToken() {
    // Chris Usertoken: "glpat-yiaHU-zWowkAZyziy1fW";
    this.authToken = 'glpat-yHamQewgiaQ-rXx2DPMG';
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
   * Adds given members to the repository and ensures there are no duplicates
   * The uuid and dbId of existing members remains unchanged
   * @param {Member[]} newMembers
   */
  addMembers(newMembers) {
    const memberMap = new Map();

    this.members.forEach(member => memberMap.set(member.gitlabId, member));

    newMembers.forEach(newMember => {
      const existingMember = memberMap.get(newMember.gitlabId);

      if (existingMember) {
        existingMember.username = newMember.username;
        existingMember.name = newMember.name;
        existingMember.email = newMember.email;
      } else {
        memberMap.set(newMember.gitlabId, newMember);
      }
    });

    this.members = Array.from(memberMap.values());
  }

  /**
   * Adds given contributors to the repository and ensures there are no duplicates
   * Updates member for each contributor
   * @param {Contributor[]} newContributors
   */
  addAndUpdateContributors(newContributors) {
    const contributorMap = new Map();

    this.contributors.forEach(contributor => contributorMap.set(contributor.email, contributor));

    newContributors.forEach(contributorEmail => {
      const contributor = new Contributor(contributorEmail);
      if (!contributorMap.has(contributor.email)) {
        contributor.uuid = randomUUID();
        contributorMap.set(contributor.email, contributor);
      }
    });

    // Update member for all contributors
    contributorMap.forEach(contributor => {
      contributor.member = this.members.find(m => m.email === contributor.email);
    });

    this.contributors = Array.from(contributorMap.values());
  }
}

/**
 *  @type {Map<string,Repository>}
 */
export const repositories = new Map();
