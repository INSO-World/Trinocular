import { randomUUID } from 'node:crypto';
import { GitView } from './git-view.js';
import { apiAuthHeader } from '../../common/api.js';



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
   * Load members from the API Bridge, put them into the repository and ensures there are no duplicates
   * The uuid and dbId of existing members remains unchanged
   */
  async loadMembers() {

    const memberMap = new Map();

    this.members.forEach(member => memberMap.set(member.gitlabId, member));


    // fetch members from API-bridge
    const resp = await fetch(
      `http://api-bridge/bridge/${this.uuid}/members`,
      apiAuthHeader({ method: 'GET' })
    );

    if (!resp.ok) {
      throw Error(`Api-Bridge did not return members for repository with uuid: ${this.uuid}`);
    }

    const newMembers= await resp.json();

    newMembers.forEach(newMember => {
      const {id: gitlabId, username, name, email} = newMember;

      const existingMember = memberMap.get(gitlabId); 
      if (existingMember) {
        existingMember.username = username;
        existingMember.name = name;
        existingMember.email = email;
      } else {
        const member = new Member(username, null, randomUUID(), gitlabId, name, email);
        memberMap.set(gitlabId, member);
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
