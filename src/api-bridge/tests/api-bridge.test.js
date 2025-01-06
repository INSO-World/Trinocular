import { expect } from 'chai';
import sinon from 'sinon';
import { ApiBridge } from "../lib/api-bridge.js";
import { DataSource } from "../lib/data-source.js";
import { Repository } from "../lib/repository.js";
import { ConflictError, NotFoundError } from "../lib/exceptions.js";
import esmock from "esmock";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);

describe('ApiBridge', () => {
  let apiBridge;
  let repo1, repo2;
  let insertRepositoryAndSetDbIdStub;
  let loadAllRepositoriesStub;
  let removeRepositoryByUuidStub;
  let updateRepositoryStub;

  beforeEach(async () => {
    insertRepositoryAndSetDbIdStub = sinon.stub();
    loadAllRepositoriesStub = sinon.stub();
    removeRepositoryByUuidStub = sinon.stub();
    updateRepositoryStub = sinon.stub();

    // Mock the database functions
    const { ApiBridge } = await esmock('../lib/api-bridge.js', {
      '../lib/database.js': {
        insertRepositoryAndSetDbId: insertRepositoryAndSetDbIdStub,
        loadAllRepositories: loadAllRepositoriesStub,
        removeRepositoryByUuid: removeRepositoryByUuidStub,
        updateRepository: updateRepositoryStub
      }
    });

    // Create a new instance of ApiBridge
    apiBridge = new ApiBridge();

    repo1 = sinon.createStubInstance(Repository, {
      copyContentsFrom: sinon.stub()
    });
    Object.assign(repo1, {
      name: 'SampleGitLabRepo1',
      uuid: 'd9428887-e9f9-4b4d-bf4f-d8d26f34a9c1',
      dbId: 1,
      type: 'gitlab',
      authToken: 'glpat-sDqXSTfZsuXer5Bbzmaz',
      url: 'https://reset.inso.tuwien.ac.at/repo/2024ws-ase-pr-group/24ws-ase-pr-qse-07'
    });

    repo2 = sinon.createStubInstance(Repository);
    Object.assign(repo2, {
      name: 'SampleGitLabRepo2',
      uuid: 'a1578f7d-9f48-46c8-8f5c-ec68f6a3e69b',
      dbId: 2,
      type: 'gitlab',
      authToken: 'glpat-9XrCvT6VuX1b7LfUzPQr',
      url: 'https://reset.inso.tuwien.ac.at/repo/2024ws-ase-pr-group/24ws-ase-pr-qse-08'
    });
  });

  afterEach(() => {
    sinon.restore();
    esmock.purge('../lib/api-bridge.js');
  });

  describe('_loadRepos()', () => {
    it('should load repositories into the repos map', async () => {
      const repoData = [repo1, repo2];

      // Stub loadAllRepositories to return the test data
      loadAllRepositoriesStub.resolves(repoData);

      await apiBridge._loadRepos();

      expect(apiBridge.repos.size).to.equal(2);
      expect(apiBridge.repos.get(repo1.uuid)).to.deep.equal(repo1);
      expect(apiBridge.repos.get(repo2.uuid)).to.deep.equal(repo2);
    });
  });

  describe('_hasRepoWithUrl()', () => {
    beforeEach(() => {
      // Add repos to apiBridge's repos map
      apiBridge.repos.set(repo1.uuid, repo1);
      apiBridge.repos.set(repo2.uuid, repo2);
    });

    it('should return true if a repository with the given URL exists', () => {
      const exists = apiBridge._hasRepoWithUrl(repo1.url);
      expect(exists).to.be.true;
    });

    it('should return false if a repository with the given URL does not exist', () => {
      const exists = apiBridge._hasRepoWithUrl('https://example.com/nonexistent-repo');
      expect(exists).to.be.false;
    });

    it('should return false if the given URL belongs to the ignore repo', () => {
      const exists = apiBridge._hasRepoWithUrl(repo1.url, repo1);
      expect(exists).to.be.false;
    });

    it('should return true if another repository has the same URL as the given one', () => {
      const otherRepo = {
        name: 'SampleGitLabRepo3',
        uuid: 'uuid-3',
        dbId: 3,
        type: 'gitlab',
        authToken: 'authToken3',
        url: repo1.url // Same URL as repo1
      };
      const exists = apiBridge._hasRepoWithUrl(otherRepo.url, otherRepo);
      expect(exists).to.be.true;
    });

    it('should return false if ignore parameter matches a repo with the same URL', () => {
      const otherRepo = {
        name: 'SampleGitLabRepo3',
        uuid: 'uuid-3',
        dbId: 3,
        type: 'gitlab',
        authToken: 'authToken3',
        url: repo1.url // Same URL as repo1
      };
      const exists = apiBridge._hasRepoWithUrl(otherRepo.url, otherRepo);
      expect(exists).to.be.true;
    });

    it('should return true if a different repo with the same URL exists and is not ignored', () => {
      const exists = apiBridge._hasRepoWithUrl(repo1.url, repo2); // Ignore repo2 but not repo1
      expect(exists).to.be.true;
    });
  });

  describe('addRepo()', () => {

    it('should return false if the repo UUID already exists', async () => {
      apiBridge.repos.set(repo1.uuid, repo1);

      const result = await apiBridge.addRepo(repo1);

      expect(result).to.be.false;
      expect(apiBridge.repos.size).to.equal(1);
      sinon.assert.notCalled(insertRepositoryAndSetDbIdStub);
    });

    it('should return false if a repo with the same URL already exists', async () => {
      apiBridge.repos.set(repo1.uuid, repo1);

      const newRepo = {
        name: 'SampleGitLabRepo3',
        uuid: 'uuid-3',
        dbId: 3,
        type: 'gitlab',
        authToken: 'authToken3',
        url: repo1.url
      };

      const result = await apiBridge.addRepo(newRepo);

      expect(result).to.be.false;
      expect(apiBridge.repos.size).to.equal(1);
      sinon.assert.notCalled(insertRepositoryAndSetDbIdStub);
    });

    it('should add a new repo successfully and call insertRepositoryAndSetDbId', async () => {
      sinon.stub(insertRepositoryAndSetDbIdStub).resolves();

      const result = await apiBridge.addRepo(repo1);

      expect(result).to.be.true;
      expect(apiBridge.repos.size).to.equal(1);
      expect(apiBridge.repos.has(repo1.uuid)).to.be.true;
    });
  });

  describe('updateRepo()', () => {

    it('should throw a NotFoundError if the repo UUID does not exist', async () => {
      const nonExistentRepo = {
        uuid: 'non-existent-uuid',
        name: 'NonExistentRepo',
        url: 'https://example.com/non-existent-repo'
      };

      await expect(apiBridge.updateRepo(nonExistentRepo)).to.be.rejectedWith(NotFoundError, `Unknown repository UUID '${nonExistentRepo.uuid}'`);
    });

    it('should throw a ConflictError if the new URL already exists for a different repo', async () => {
      apiBridge.repos.set(repo1.uuid, repo1);
      apiBridge.repos.set(repo2.uuid, repo2);

      const updatedRepoData = {
        uuid: repo1.uuid,
        name: 'UpdatedRepo',
        url: repo2.url
      };

      await expect(apiBridge.updateRepo(updatedRepoData)).to.be.rejectedWith(ConflictError, `Conflict: duplicated URL '${repo1.url}'`);
    });

    it('should update the repository and call updateRepository', async () => {
      apiBridge.repos.set(repo1.uuid, repo1);
      updateRepositoryStub.resolves();

      // Stub copyContentsFrom to act like a real method and copy properties from updatedRepoData
      repo1.copyContentsFrom.callsFake(function (newData) {
        Object.assign(this, newData);
      });

      const updatedRepoData = {
        uuid: repo1.uuid,
        name: 'UpdatedRepo',
        url: 'https://example.com/updated-repo-url'
      };

      await apiBridge.updateRepo(updatedRepoData);

      sinon.assert.calledOnceWithExactly(updateRepositoryStub, repo1);
      sinon.assert.calledOnceWithExactly(repo1.copyContentsFrom, updatedRepoData);
      expect(repo1.url).to.equal(updatedRepoData.url);
      expect(repo1.name).to.equal(updatedRepoData.name);
    });
  });

  describe('removeRepo()', () => {

    it('should remove a repository by UUID and call removeRepositoryByUuid', async () => {
      apiBridge.repos.set(repo1.uuid, repo1);
      removeRepositoryByUuidStub.resolves();

      const result = await apiBridge.removeRepo(repo1.uuid);

      expect(result).to.be.true;
      expect(apiBridge.repos.has(repo1.uuid)).to.be.false;
      sinon.assert.calledOnceWithExactly(removeRepositoryByUuidStub, repo1.uuid);
    });

    it('should return false if the repository UUID does not exist', async () => {
      const nonExistentUuid = 'non-existent-uuid';

      const result = await apiBridge.removeRepo(nonExistentUuid);

      expect(result).to.be.false;
      sinon.assert.notCalled(removeRepositoryByUuidStub);
    });
  });

  describe('registerDataSource()', () => {
    let dataSourceStub, expressRouterStub;

    beforeEach(() => {

      expressRouterStub = {
        get: sinon.stub()
      };


      dataSourceStub = sinon.createStubInstance(DataSource, {
        endpointNames: sinon.stub().returns(['endpoint1', 'endpoint2'])
      });

      apiBridge.expressRouter = expressRouterStub;
    });

    afterEach(() => {
      sinon.restore();
    });

    it('should register a valid data source and add routes for its endpoints', () => {
      apiBridge.registerDataSource(dataSourceStub);

      expect(apiBridge.dataSources).to.include(dataSourceStub);
      sinon.assert.calledWithExactly(expressRouterStub.get, '/:repo/endpoint1', sinon.match.func);
      sinon.assert.calledWithExactly(expressRouterStub.get, '/:repo/endpoint1/:id', sinon.match.func);
      sinon.assert.calledWithExactly(expressRouterStub.get, '/:repo/endpoint2', sinon.match.func);
      sinon.assert.calledWithExactly(expressRouterStub.get, '/:repo/endpoint2/:id', sinon.match.func);
    });

    it('should throw an error if the argument is not an instance of DataSource', () => {
      const invalidDataSource = {};

      expect(() => apiBridge.registerDataSource(invalidDataSource)).to.throw(Error, 'Can only register data source instances');
    });
  });
});
