import { expect } from 'chai';
import sinon from 'sinon';
import request from 'supertest';
import express from 'express';
import esmock from 'esmock';

process.env.INTERNAL_API_SECRET = 'glpat-MwxgTzEe3Amp27K8jCYe';
describe('Routes', () => {
  let app, serverStub;

  const uuid = "550e8400-e29b-41d4-a716-446655440000";

  const commonHeaders = {
    Authorization: `bearer ${process.env.INTERNAL_API_SECRET}`
  };

  beforeEach(async () => {
    try { await initLogger(false); } catch(e) {}
    
    serverStub = {
      getRepository: sinon.stub(),
      postRepository: sinon.stub(),
      deleteRepository: sinon.stub(),
      putRepository: sinon.stub(),
      postSnapshot: sinon.stub(),
      getCommitStats: sinon.stub()
    };

    let dummyRequestHandler = sinon.stub().callsFake((req, res) => {
      return res.json({ data: { 'test': 'testy' } });
    });
    const routesMock = await esmock('../routes/routes.js', {
      '../routes/repository.js': {
        deleteRepository: dummyRequestHandler,
        getRepository: dummyRequestHandler,
        postRepository: dummyRequestHandler,
        putRepository: dummyRequestHandler,
        getCommitStats: dummyRequestHandler
      },
      '../routes/snapshot.js': {
        postSnapshot: dummyRequestHandler
      }
    });

    app = express();
    app.use(express.json());
    app.use(routesMock.routes);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('Should return 401 with wrong/missing auth', () => {
    return request(app)
      .get('/repository/550e8400-e29b-41d4-a716-446655440000')
      .expect(401)
      .expect(res => {
        expect(res.text).to.equal('Unauthorized');
      });
  });


  describe('POST /repository/:uuid', () => {
    it('should exist', async () => {
      const repoData = { data: 'repo' };

      await request(app)
        .post(`/repository/${uuid}`)
        .send(repoData)
        .set(commonHeaders)
        .expect(200);
    });
  });

  describe('GET /repository/:uuid', () => {
    it('should exist', async () => {
      await request(app)
        .get(`/repository/${uuid}`)
        .set(commonHeaders)
        .expect(200);
    });
  });

  describe('PUT /repository/:uuid', () => {
    it('should exist', async () => {
      const updatedRepo = { data: 'updated-repo' };

      await request(app)
        .put(`/repository/${uuid}`)
        .set(commonHeaders)
        .send(updatedRepo)
        .expect(200);
    });
  });

  describe('DELETE /repository/:uuid', () => {
    it('should exist', async () => {
      serverStub.deleteRepository.returns(true);

      await request(app)
        .delete(`/repository/${uuid}`)
        .set(commonHeaders)
        .expect(200);
    });
  });

  describe('GET /repository/:uuid/commits/stats', () => {
    it('should exist', async () => {

      await request(app)
        .delete(`/repository/${uuid}`)
        .set(commonHeaders)
        .expect(200);
    });
  });

  describe('POST /snapshot/:uuid', () => {
    it('should exist', async () => {
      await request(app)
        .post(`/snapshot/${uuid}`)
        .set(commonHeaders)
        .send({ message: 'Create snapshot' })
        .expect(200);
    });
  });
});
