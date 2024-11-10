import { Router } from 'express';
import { DataSource } from './data-source.js';
import { Repository } from './repository.js';
import {
  insertRepositoryAndSetDbId,
  loadAllRepositories,
  removeRepositoryByUuid,
  updateRepository
} from './database.js';

export class ApiBridge {

  static _instance= null;

  static create() {
    if( !ApiBridge._instance ) {
      ApiBridge._instance= new ApiBridge();
    }
  }

  /** @return {ApiBridge?} */
  static the() {
    return ApiBridge._instance;
  }

  constructor() {
    /** @type {DataSource[]} */
    this.dataSources= [];

    /** @type {Map<string, Repository>} */
    this.repos= new Map();

    this.expressRouter= new Router();
  }

  async _loadRepos() {
    const repos= await loadAllRepositories();

    this.repos.clear();
    repos.forEach( repo => this.repos.set( repo.uuid, repo ) );
  }

  /**
   * @param {Repository} repo 
   */
  async addRepo( repo ) {
    // Repo uuid already exists
    if( this.repos.has(repo.uuid) ) {
      return false;
    }

    // Repo url already exists
    for(const [uuid, oldRepo] of this.repos ) {
      if( oldRepo.url === repo.url ) {
        return false;
      }
    }

    this.repos.set( repo.uuid, repo )
    insertRepositoryAndSetDbId( repo );
    return true;
  }

  /**
   * @param {Repository} repo 
   */
  async updateRepo( newRepoData ) {
    const repo= this.repos.get( newRepoData.uuid )
    if( !repo ) {
      return false;
    }

    repo.copyContentsFrom( newRepoData );
    updateRepository( repo );
    return true;
  }

  /**
   * @param {string} repoUuid 
   */
  async removeRepo( repoUuid ) {
    if( !this.repos.delete( repoUuid ) ) {
      return false;
    }

    removeRepositoryByUuid( repoUuid );
    return true;
  }

  registerDataSource( ds ) {
    if( !(ds instanceof DataSource) ) {
      throw Error(`Can only register data source instances`);
    }

    // Add the data source
    this.dataSources.push( ds );

    // Add REST GET routes for single and all records of the data source endpoints
    for( const endpoint of ds.endpointNames() ) {
      this.expressRouter.get(`/:repo/${endpoint}`, (req, res) => this._handleGetAll(req, res, endpoint, ds) );
      this.expressRouter.get(`/:repo/${endpoint}/:id`, (req, res) => this._handleGetSingle(req, res, endpoint, ds) );
    }
  }

  async init() {
    await this._loadRepos();

    // Wait for all data sources to initialize themselves
    await Promise.all( this.dataSources.map( ds => ds.onInit() ) );

    // Count the number of endpoints
    let numEndpoints= 0;
    this.dataSources.forEach( ds => numEndpoints+= ds.endpointNames().length );

    // Print configuration after initialization
    console.log(`Initialized ${this.dataSources.length} data sources and ${numEndpoints} endpoints`);
    this.dataSources.forEach( ds => {
      const endpoints= ds.endpointNames().join(', ');
      console.log(`- ${ds.constructor.name} [${endpoints}]`);
    });
  }

  // async clearAllRepositorySnapshots() {}

  async createSnapshot( repoUuid ) {
    const repo= this.repos.get( repoUuid );
    if( !repo ) {
      return false;
    }

    // TODO: Mark as busy 
    
    // Clear all snapshots
    await Promise.all( this.dataSources.map( ds => ds.clearSnapshot( repo ) ) );

    // fetch new data for each repo 
    await Promise.all( this.dataSources.map( ds => ds.createSnapshot( repo ) ) );
    
    // TODO: Mark as ready

    return true;
  }

  get routes() { return this.expressRouter; }

  async _handleGetAll(req, res, endpoint, dataSource ) {
    const repo= this.repos.get( req.params.repo );
    if( !repo ) {
      return res.sendStatus(404);
    }

    // TODO: Check busy status

    const result= await dataSource.getAll( repo, endpoint );
    res.json( result );
  }

  async _handleGetSingle(req, res, endpoint, dataSource ) {
    const repo= this.repos.get( req.params.repo );
    if( !repo ) {
      return res.sendStatus(404);
    }

    // TODO: Check busy status

    const result= await dataSource.getSingleById( repo, endpoint, req.params.id );
    if( result ) {
      res.json( result );
    } else {
      res.sendStatus( 404 );
    }
  }
}
