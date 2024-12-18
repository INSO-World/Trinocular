import { expect } from 'chai';
import sinon from 'sinon';
import request from 'supertest';
import express from 'express';
import { routes } from '../routes/routes.js';
import { ApiBridge } from "../lib/api-bridge.js";

describe('Routes', () => {
  let app, serverStub;
  const commonHeaders = {
    Authorization: `bearer ${process.env.INTERNAL_API_SECRET}`
  };

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(routes);

    serverStub = {
      getAllRepositories: sinon.stub(),
      getRepository: sinon.stub(),
      postRepository: sinon.stub(),
      deleteRepository: sinon.stub(),
      putRepository: sinon.stub(),
      postSnapshot: sinon.stub(),
    };

    sinon.stub(ApiBridge, 'the').returns({
      registerDataSource: sinon.stub().returns(serverStub),
      init: sinon.stub().returns(serverStub),
      routes: sinon.stub().returns(serverStub)
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should return 401 with wrong/missing auth', () => {
    return request(app)
      .get('/repository')
      .expect(401)
      .expect(res => {
        expect(res.text).to.equal('Unauthorized');
      });
  });

  describe('GET /repository', () => {
    it('should return basic information of all repositories', async () => {
      const repoData = [
        {
          "name": "SampleGitLabRepo1",
          "uuid": "d9428887-e9f9-4b4d-bf4f-d8d26f34a9c1",
          "type": "gitlab",
          "url": "https://reset.inso.tuwien.ac.at/repo/2024ws-ase-pr-group/24ws-ase-pr-qse-07",
          "authToken": "glpat-sDqXSTfZsuXer5Bbzmaz"
        },
        {
          "name": "SampleGitLabRepo2",
          "uuid": "a1578f7d-9f48-46c8-8f5c-ec68f6a3e69b",
          "type": "gitlab",
          "url": "https://reset.inso.tuwien.ac.at/repo/2024ws-ase-pr-group/24ws-ase-pr-qse-08",
          "authToken": "glpat-9XrCvT6VuA1b7LfUzPQr"
        }
      ];

      serverStub.getAllRepositories.returns(repoData);

      await request(app)
        .get('/repository')
        .set(commonHeaders)
        .then(req => {
          console.log('Request Details:', req.request);
        })
        .expect(200)
        .expect(res => {
          expect(res.body).to.deep.equal(repoData);
        });
    });
  });

  describe('GET /repository/:uuid', () => {
    it('should return basic information of the given repository', async () => {
      const uuid = 'd9428887-e9f9-4b4d-bf4f-d8d26f34a9c1';
      const repoData =
        {
          "name": "SampleGitLabRepo1",
          "uuid": uuid,
          "type": "gitlab",
          "url": "https://reset.inso.tuwien.ac.at/repo/2024ws-ase-pr-group/24ws-ase-pr-qse-07",
          "authToken": "glpat-sDqXSTfZsuXer5Bbzmaz"
        };

      serverStub.getRepository.returns(repoData);

      await request(app)
        .get(`/repository/${uuid}`)
        .set(commonHeaders)
        .expect(200)
        .expect(res => {
          expect(res.body).to.deep.equal(repoData);
        });
    });

    it('should return 404 if repository is not found', async () => {
      serverStub.getRepository.returns(null);

      await request(app)
        .get('/repository/${uuid}')
        .set(commonHeaders)
        .expect(404);
    });
  });

  describe('PUT /repository/:uuid', () => {
    it('should update an existing repository', async () => {
      const uuid = 'd9428887-e9f9-4b4d-bf4f-d8d26f34a9c1';
      const updatedRepo = {
        "name": "UpdatedRepo",
        "url": "https://example.com/updated-repo"
      };

      serverStub.putRepository.returns(true);

      await request(app)
        .put(`/repository/${uuid}`)
        .set(commonHeaders)
        .send(updatedRepo)
        .expect(200);
    });
  });

  describe('DELETE /repository/:uuid', () => {
    it('should delete an existing repository', async () => {
      const uuid = 'd9428887-e9f9-4b4d-bf4f-d8d26f34a9c1';

      serverStub.deleteRepository.returns(true);

      await request(app)
        .delete(`/repository/${uuid}`)
        .set(commonHeaders)
        .expect(200);
    });
  });

  describe('POST /repository/:uuid', () => {
    it('should create a new repository with the given UUID', async () => {
      const uuid = 'd9428887-e9f9-4b4d-bf4f-d8d26f34a9c1';
      const repoData =
        {
          "name": "SampleGitLabRepo1",
          "uuid": uuid,
          "type": "gitlab",
          "url": "https://reset.inso.tuwien.ac.at/repo/2024ws-ase-pr-group/24ws-ase-pr-qse-07",
          "authToken": "glpat-sDqXSTfZsuXer5Bbzmaz"
        };

      serverStub.getRepository.returns(repoData);

      await request(app)
        .post(`/repository/${uuid}`)
        .set(commonHeaders)
        .send(repoData)
        .expect(200)
        .expect(res => {
          expect(res.body).to.deep.equal(repoData);
        });
    });
  });

  describe('POST /snapshot/:uuid', () => {
    it('should create a snapshot for the given UUID', async () => {
      const uuid = 'd9428887-e9f9-4b4d-bf4f-d8d26f34a9c1';

      serverStub.postSnapshot.returns(true);

      await request(app)
        .post(`/snapshot/${uuid}`)
        .set(commonHeaders)
        .send({ message: 'Create snapshot' })
        .expect(201);
    });
  });
});
