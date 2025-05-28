import { GitLabAPI } from './gitlab-api.js';

export class Repository {
  /**
   * @param {string} name
   * @param {string} uuid
   * @param {number} dbId
   * @param {type} type
   * @param {string} authToken
   * @param {string} url
   * @param {string?} baseURL
   * @param {string?} projectId
   */
  constructor(name, uuid, dbId, type, authToken, url, baseURL= null, projectId= null) {
    this.name = name;
    this.uuid = uuid;
    this.dbId = dbId;
    this.type = type;
    this.url = url;
    this.baseURL= baseURL;
    this.projectId= projectId;
    this.authToken = authToken;
  }

  /**
   * Copies the data from another repo except the database id and UUID
   * @param {Repository} other
   */
  copyContentsFrom(other) {
    this.name = other.name;
    this.type = other.type;
    this.url = other.url;
    this.baseURL= other.baseURL;
    this.projectId= other.projectId;
    this.authToken = other.authToken;
  }

  api() {
    if (this.type === 'github') {
      throw Error('GitHub APIs are not supported');
    }

    if (this.type === 'gitlab') {
      return new GitLabAPI(this);
    }

    throw Error(`Unknown API type '${this.type}'`);
  }
}
