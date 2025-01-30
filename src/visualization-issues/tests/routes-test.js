import { expect } from 'chai';
import supertest from 'supertest';
import esmock from 'esmock';
import express from 'express';

describe('Routes', function () {
  let routes;
  let app;

  // Set environment variables used by the routes
  before(() => {
    process.env.HOST_BASE_NAME = 'localhost:3000';
    process.env.SERVICE_NAME = 'test-service';
  });

  before(async () => {
    // Mock implementations for dependencies
    const templateFileMock = (filePath, data) => {
      return `<html><body>Base URL: ${data.baseURL}</body></html>`;
    };

    const loadIssuesFromDatabaseMock = (req, res) => {
      res.json({ issues: [{ id: 1, title: 'Issue 1' }] });
    };

    const loadMilestonesFromApiMock = (req, res) => {
      res.json({ milestones: [{ id: 10, name: 'Milestone 1' }] });
    };

    const postSnapshotMock = (req, res) => {
      res.sendStatus(200);
    };

    routes = await esmock('../routes/routes.js', {
      '../../common/template.js': { templateFile: templateFileMock },
      '../routes/issues.js': {
        loadIssuesFromDatabase: loadIssuesFromDatabaseMock,
        loadMilestonesFromApi: loadMilestonesFromApiMock
      },
      '../routes/api/snapshot.js': { postSnapshot: postSnapshotMock }
    });
  });

  beforeEach(() => {
    app = express();
    app.use(routes.routes);
  });

  it('GET / or /index.html should return the index page', async () => {
    const agent = supertest(app);

    const res1 = await agent.get('/');
    expect(res1.status).to.equal(200);
    expect(res1.type).to.equal('text/html');
    expect(res1.text).to.include('Base URL: http://localhost:3000/test-service');

    const res2 = await agent.get('/index.html');
    expect(res2.status).to.equal(200);
    expect(res2.type).to.equal('text/html');
    expect(res2.text).to.include('Base URL: http://localhost:3000/test-service');
  });

  it('GET /data/burndown-chart should return issues from the database', async () => {
    const agent = supertest(app);

    const res = await agent.get('/data/burndown-chart');
    expect(res.status).to.equal(200);
    expect(res.type).to.equal('application/json');
    expect(res.body).to.deep.equal({ issues: [{ id: 1, title: 'Issue 1' }] });
  });

  it('GET /data/milestones should return milestones from the API', async () => {
    const agent = supertest(app);

    const res = await agent.get('/data/milestones');
    expect(res.status).to.equal(200);
    expect(res.type).to.equal('application/json');
    expect(res.body).to.deep.equal({ milestones: [{ id: 10, name: 'Milestone 1' }] });
  });

  it('POST /api/snapshot/:uuid should respond with 200', async () => {
    const agent = supertest(app);

    const uuid = 'some-uuid-value';
    const res = await agent.post(`/api/snapshot/${uuid}`).query({ transactionId: 'trans-123' });
    expect(res.status).to.equal(200);
  });
});
