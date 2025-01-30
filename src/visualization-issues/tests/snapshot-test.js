import { expect } from 'chai';
import sinon from 'sinon';
import esmock from 'esmock';

describe('postSnapshot', function () {
  let postSnapshot;

  let getRepositoryForUuidStub;
  let getDatasourceForRepositoryFromApiBridgeStub;
  let getDynamicDateRangeStub;
  let mapDataToRangeStub;
  let insertBurndownChartDataStub;
  let sendSchedulerCallbackStub;

  let req, res;

  beforeEach(async function () {
    // Mock Data
    const repo = { uuid: 'repo-uuid-1', created_at: '2020-01-01T00:00:00Z' };
    const issueData = [
      { date: '2020-01-02', openIssues: 5, open_issues_info: { detail: 'some info' } }
    ];
    const filledData = {
      dailyData: [{ date: '2020-01-02', openIssues: 5, open_issues_info: { detail: 'some info' } }],
      weeklyData: [
        { date: '2020-01-02', openIssues: 5, open_issues_info: { detail: 'some info' } }
      ],
      monthlyData: [
        { date: '2020-01-02', openIssues: 5, open_issues_info: { detail: 'some info' } }
      ]
    };

    // Stubs
    getRepositoryForUuidStub = sinon.stub().resolves({
      getRepoError: null,
      data: [repo]
    });

    getDatasourceForRepositoryFromApiBridgeStub = sinon.stub().resolves({
      getDataSourceError: null,
      data: issueData
    });

    getDynamicDateRangeStub = sinon.stub().returns(['2020-01-02']);
    mapDataToRangeStub = sinon.stub().returns(filledData);

    insertBurndownChartDataStub = sinon.stub().resolves();
    sendSchedulerCallbackStub = sinon.stub().resolves();

    req = {
      query: { transactionId: 'trans-123' },
      params: { uuid: 'repo-uuid-1' }
    };

    res = {
      sendStatus: sinon.stub()
    };

    postSnapshot = (
      await esmock('../routes/api/snapshot.js', {
        '../lib/requests.js': {
          getRepositoryForUuid: getRepositoryForUuidStub,
          getDatasourceForRepositoryFromApiBridge: getDatasourceForRepositoryFromApiBridgeStub
        },
        '../lib/burndown-chart-utils.js': {
          getDynamicDateRange: getDynamicDateRangeStub,
          mapDataToRange: mapDataToRangeStub
        },
        '../../common/index.js': {
          sendSchedulerCallback: sendSchedulerCallbackStub
        },
        '../lib/database.js': {
          insertBurndownChartData: insertBurndownChartDataStub
        },
        process: {
          env: {
            SERVICE_NAME: 'test-service'
          }
        }
      })
    ).postSnapshot;
  });

  it('should send a 200 status, fetch repo & issues, process data, insert into DB and send callback', async function () {
    await postSnapshot(req, res);

    // 1. Check that a 200 status is sent
    expect(res.sendStatus.calledOnceWith(200)).to.be.true;

    // 2. Verify repository fetch
    expect(getRepositoryForUuidStub.calledOnceWith('repo-uuid-1')).to.be.true;

    // 3. Verify issues fetch
    expect(getDatasourceForRepositoryFromApiBridgeStub.calledOnceWith('issues', 'repo-uuid-1')).to
      .be.true;

    // 4. Check that data processing functions are called
    expect(getDynamicDateRangeStub.calledOnce).to.be.true;
    expect(mapDataToRangeStub.calledOnce).to.be.true;

    // 5. Check that insertBurndownChartData is called for daily, weekly, monthly
    expect(insertBurndownChartDataStub.calledThrice).to.be.true;

    expect(sendSchedulerCallbackStub.calledOnceWith('trans-123', 'ok')).to.be.true;
  });
});
