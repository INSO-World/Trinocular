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
    it('should exist', async () => {
      const repoData = {data: 'repos'};

      serverStub.getAllRepositories.returns(repoData);

      await request(app)
        .get('/repository')
        .set(commonHeaders)
        .then(req => {
          console.log('Request Details:', req.request);
        })
        .expect(200);
    });
  });

  describe('GET /repository/:uuid', () => {
    it('should exist', async () => {
      const uuid = 'repo-uuid';
      const repoData = {data: 'repo'};

      serverStub.getRepository.returns(repoData);

      await request(app)
        .get(`/repository/${uuid}`)
        .set(commonHeaders)
        .expect(200);
    });
  });

  describe('PUT /repository/:uuid', () => {
    it('should exist', async () => {
      const uuid = 'repo-uuid';
      const repoData = {data: 'updated-repo'};
      serverStub.putRepository.returns(true);

      await request(app)
        .put(`/repository/${uuid}`)
        .set(commonHeaders)
        .send(updatedRepo)
        .expect(200);
    });
  });

  describe('DELETE /repository/:uuid', () => {
    it('should exist', async () => {
      const uuid = 'repo-uuid';

      serverStub.deleteRepository.returns(true);

      await request(app)
        .delete(`/repository/${uuid}`)
        .set(commonHeaders)
        .expect(200);
    });
  });

  describe('POST /repository/:uuid', () => {
    it('should exist', async () => {
      const uuid = 'repo-uuid';
      const repoData = {data: 'repo'};

      serverStub.getRepository.returns(repoData);

      await request(app)
        .post(`/repository/${uuid}`)
        .set(commonHeaders)
        .expect(200);
    });
  });

  describe('POST /snapshot/:uuid', () => {
    it('should exist', async () => {
      const uuid = 'repo-uuid';

      serverStub.postSnapshot.returns(true);

      await request(app)
        .post(`/snapshot/${uuid}`)
        .set(commonHeaders)
        .send({ message: 'Create snapshot' })
        .expect(201);
    });
  });
});
