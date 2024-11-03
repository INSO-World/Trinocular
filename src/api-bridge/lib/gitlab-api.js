
/** @typedef {import('./repository.js').Repository} Repository */

export class GitLabAPI {

  /**
   * @param {Repository} repo 
   */
  constructor( repo ) {
    this.repository= repo;
  }

  // fetch -> fetch with authentication
  // fetchAllWithPagination -> fetch with auth that follows all nextPage links in the header to load all records
  // 
}
