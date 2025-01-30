import { expect } from 'chai';
import express from 'express';
import supertest from 'supertest';
import esmock from 'esmock';

describe('Issues Handlers', () => {
  let loadIssuesFromDatabase;
  let loadMilestonesFromApi;
  let app;

  before(async () => {
    // Mock the dependencies
    const getBurndownChartDataStub = async (repo, rangeType) => {
      return [{ date: '2020-01-01', openIssues: 5, rangeType }];
    };

    const getDatasourceForRepositoryFromApiBridgeStub = async (type, repo) => {
      return { data: [{ id: 1, title: 'Milestone 1' }] };
    };

    // Import the module under test with esmock, overriding its dependencies
    const mod = await esmock('../routes/issues.js', {
      '../lib/database.js': { getBurndownChartData: getBurndownChartDataStub },
      '../lib/requests.js': {
        getDatasourceForRepositoryFromApiBridge: getDatasourceForRepositoryFromApiBridgeStub
      }
    });

    loadIssuesFromDatabase = mod.loadIssuesFromDatabase;
    loadMilestonesFromApi = mod.loadMilestonesFromApi;
  });

  beforeEach(() => {
    app = express();
    app.get('/database-issues', loadIssuesFromDatabase);
    app.get('/api-milestones', loadMilestonesFromApi);
  });

  it('loadIssuesFromDatabase should return day, week, month data from Database', async () => {
    const agent = supertest(app);

    const res = await agent.get('/database-issues').query({ repo: 'test-repo' });
    expect(res.status).to.equal(200);
    expect(res.body).to.have.keys(['dayData', 'weekData', 'monthData']);
  });

  it('loadMilestonesFromApi should return milestones from the API', async () => {
    const agent = supertest(app);

    const res = await agent.get('/api-milestones').query({ repo: 'test-repo' });
    expect(res.status).to.equal(200);
    expect(res.body).to.deep.equal({ data: [{ id: 1, title: 'Milestone 1' }] });
  });
});
