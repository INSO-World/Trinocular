import { expect } from 'chai';
import esmock from 'esmock';

describe('Database Utils', function () {
  let getBurndownChartData;
  let insertBurndownChartData;

  let poolQueryStub;
  let formatInsertManyValuesStub;

  beforeEach(async function () {
    // Setup mocks
    poolQueryStub = async (query, parameters) => {
      // Default mock behavior: return empty rows
      return { rows: [] };
    };

    formatInsertManyValuesStub = (data, pushParams) => {
      // We can simulate formatting logic here
      // For simplicity, assume data has length and we produce placeholders
      const valuesString = data
        .map((_, i) => `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`)
        .join(',');
      const parameters = [];
      data.forEach(issue => {
        pushParams(parameters, issue);
      });
      return { valuesString, parameters };
    };

    // esmock the module under test and replace its dependencies
    const mod = await esmock('../lib/database.js', {
      '../../postgres-utils/index.js': {
        formatInsertManyValues: formatInsertManyValuesStub,
        pg: { types: { setTypeParser: () => {} } },
        pool: { query: poolQueryStub }
      }
    });

    getBurndownChartData = mod.getBurndownChartData;
    insertBurndownChartData = mod.insertBurndownChartData;
  });

  describe('getBurndownChartData', function () {
    it('should query the database with correct parameters and return rows', async function () {
      const uuid = 'test-uuid';
      const timeGranularity = 'day';

      // Override poolQueryStub to return a custom result
      poolQueryStub = async (query, params) => {
        expect(query.replace(/\s+/g, ' ')).to.include(
          'SELECT date, open_issues, open_issues_info FROM issue_day WHERE uuid = $1 ORDER BY date'
        );
        expect(params).to.deep.equal([uuid]);
        return {
          rows: [
            { date: '2020-01-01', open_issues: 5, open_issues_info: { detail: 'info1' } },
            { date: '2020-01-02', open_issues: 3, open_issues_info: { detail: 'info2' } }
          ]
        };
      };

      // Re-mock with updated stub
      const mod = await esmock('../lib/database.js', {
        '../../postgres-utils/index.js': {
          formatInsertManyValues: formatInsertManyValuesStub,
          pg: { types: { setTypeParser: () => {} } },
          pool: { query: poolQueryStub }
        }
      });
      getBurndownChartData = mod.getBurndownChartData;

      const rows = await getBurndownChartData(uuid, timeGranularity);
      expect(rows).to.deep.equal([
        { date: '2020-01-01', open_issues: 5, open_issues_info: { detail: 'info1' } },
        { date: '2020-01-02', open_issues: 3, open_issues_info: { detail: 'info2' } }
      ]);
    });
  });

  describe('insertBurndownChartData', function () {
    it('should insert data and return inserted IDs', async function () {
      const uuid = 'test-uuid';
      const timeGranularity = 'week';
      const issueData = [
        { date: '2020-01-01', openIssues: 5, open_issues_info: { detail: 'info1' } },
        { date: '2020-01-02', openIssues: 3, open_issues_info: { detail: 'info2' } }
      ];

      poolQueryStub = async (query, params) => {
        query = query.replace(/\s+/g, ' ');
        // Check that the query and parameters are formed as expected
        expect(query).to.contain(
          'INSERT INTO issue_week (uuid, date, open_issues, open_issues_info)'
        );
        expect(query).to.contain('ON CONFLICT ON CONSTRAINT unique_uuid_week DO UPDATE');

        // Check if parameters match our data
        // For 2 issues: params should be [uuid, date1, openIssues1, info1, uuid, date2, openIssues2, info2]
        expect(params).to.have.length(8);
        expect(params[0]).to.equal(uuid);
        expect(params[1]).to.equal('2020-01-01');
        expect(params[2]).to.equal(5);
        expect(params[3]).to.deep.equal({ detail: 'info1' });
        expect(params[4]).to.equal(uuid);
        expect(params[5]).to.equal('2020-01-02');
        expect(params[6]).to.equal(3);
        expect(params[7]).to.deep.equal({ detail: 'info2' });

        return { rows: [{ id: 1 }, { id: 2 }] };
      };

      // Re-mock with updated stub
      const mod = await esmock('../lib/database.js', {
        '../../postgres-utils/index.js': {
          formatInsertManyValues: formatInsertManyValuesStub,
          pg: { types: { setTypeParser: () => {} } },
          pool: { query: poolQueryStub }
        }
      });
      insertBurndownChartData = mod.insertBurndownChartData;

      const result = await insertBurndownChartData(uuid, issueData, timeGranularity);
      expect(result.rows).to.deep.equal([{ id: 1 }, { id: 2 }]);
    });
  });
});
