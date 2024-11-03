
/** @typedef {import('./repository.js').Repository} Repository */

import { Storage } from './storage.js';


export class DataSource {
  constructor() {}

  /** @returns {string[]} */
  endpointNames() {}

  async onInit() {}

  /**
   * @param {Repository?} repo clear for all repos when null
   */
  async clearSnapshot( repo ) {
    for( const endpoint of this.endpointNames() ) {
      const storage= new Storage( endpoint );
      await storage.clear( repo );
    }
  }

  /**
   * @param {Repository} repo 
   */
  async createSnapshot( repo ) {}

  /**
   * @param {Repository} repo 
   * @param {string} endpoint 
   * @param {string} id
   */
  async getSingleById( repo, endpoint, id ) {
    const storage= new Storage( endpoint );
    return storage.getRecordById( repo, id );
  }

  /**
   * @param {Repository} repo 
   * @param {string} endpoint 
   */
  async getAll( repo, endpoint ) {
    const storage= new Storage( endpoint );
    return storage.getAllRecords( repo );
  }
}
