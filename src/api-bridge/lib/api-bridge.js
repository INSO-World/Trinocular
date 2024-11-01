import { Router } from "express";

export class ApiBridge {

  constructor() {
    this.expressRouter= new Router();
  }

  // async loadRepos() {}

  // registerDataSource( ds ) {}

  // initDataSources() {}

  // performSnapshot() {} -> loadRepos() to make sure -> mark as busy -> clear all old snapshots -> fetch new data for each repo -> mark as ready

  get routes() { return this.expressRouter; }

}
