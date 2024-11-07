import { GitView } from './git-view.js';

export class Contributor {
  /**
   * @param {string} email 
   * @param {number} dbId 
   * @param {string} uuid 
   * @param {Member?} member 
  */
  constructor(email, dbId, uuid, member) {
    this.email= email;
    this.dbId= dbId;
    this.uuid= uuid;
    this.member= member;
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
  constructor(username, dbId, uuid, gitlabId, name, email ) {
    this.username= username;
    this.dbId= dbId;
    this.uuid= uuid;
    this.gitlabId= gitlabId;
    this.name= name;
    this.email= email;
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
  constructor( name, dbId, uuid, gitUrl, type, members, contributors, authToken= null ) {
    this.name= name;
    this.dbId= dbId;
    this.uuid= uuid;
    this.gitUrl= gitUrl;
    this.type= type;        // either 'gitlab' or 'gitlab'
    this.members= members;
    this.contributors= contributors;
    this.authToken= authToken;

    this.gitView= null;
  }

  // async loadAuthToken() {}

  async gitView() {
    if( !this.gitView ) {
      this.gitView= new GitView( this );
      await this.gitView.openOrClone();
    }
    return this.gitView;
  }
}



