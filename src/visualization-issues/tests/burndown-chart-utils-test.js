import { expect } from 'chai';
import esmock from 'esmock';

describe('burndown-chart-utils', function () {
  let getDynamicDateRange;
  let mapDataToRange;

  before(async () => {
    // Import the module with esmock (no overrides needed as this is pure logic)
    const mod = await esmock('../lib/burndown-chart-utils.js', {});
    getDynamicDateRange = mod.getDynamicDateRange;
    mapDataToRange = mod.mapDataToRange;
  });

  describe('getDynamicDateRange', function () {
    it('should return a range of dates from repo created_at to repo updated_at', function () {
      const repo = {
        created_at: '2020-01-01T00:00:00Z',
        updated_at: '2020-01-03T12:00:00Z'
      };
      const dateRange = getDynamicDateRange([], repo);

      // Expected range: 2020-01-01, 2020-01-02, 2020-01-03
      expect(dateRange).to.deep.equal(['2020-01-01', '2020-01-02', '2020-01-03']);
    });

    it('should default end date to current date if updated_at is not defined', function () {
      const repo = {
        created_at: '2020-01-01T00:00:00Z'
      };

      const dateRange = getDynamicDateRange([], repo);
      expect(dateRange[0]).to.equal('2020-01-01');
      expect(dateRange[dateRange.length - 1]).to.equal(new Date().toISOString().split('T')[0]);
    });
  });

  describe('Daily Data', function () {
    let repo;
    let dateRange;
    let issueData;
    let dailyData;
    let weeklyData;
    let monthlyData;

    before(function () {
      // This repo range goes from 2024-10-01 to 2025-01-05.
      // This gives us several months and multiple weeks to test weekly and monthly snapshots.
      repo = { created_at: '2024-10-01T00:00:00Z', updated_at: '2025-01-04T00:00:00Z' };
      dateRange = getDynamicDateRange([], repo);

      // Issues cover various spans:
      // 1. Short issue within the same week and month
      // 2. Issue that covers a Sunday (weekly boundary)
      // 3. Issue that crosses a month boundary (October -> November)
      // 4. Issue lasting through multiple months (December -> January)
      issueData = [
        {
          id: 1,
          title: 'Short Issue in October',
          created_at: '2024-10-01T10:00:00Z',
          closed_at: '2024-10-02T10:00:00Z',
          human_total_time_spent: 8
        },
        {
          id: 2,
          title: 'Issue crossing Sunday',
          // Suppose Sunday in October 2024 is on the 6th,
          // this issue is open from 5th to 7th
          created_at: '2024-10-05T10:00:00Z',
          closed_at: '2024-10-07T10:00:00Z',
          human_total_time_spent: 4
        },
        {
          id: 3,
          title: 'Issue crossing month boundary',
          // Crosses from late October into November
          created_at: '2024-10-20T10:00:00Z',
          closed_at: '2024-11-02T10:00:00Z',
          human_total_time_spent: 10
        },
        {
          id: 4,
          title: 'Long issue (December to January)',
          // Stays open from December 1 to January 2
          created_at: '2024-12-01T10:00:00Z',
          closed_at: '2025-01-02T10:00:00Z',
          human_total_time_spent: 20
        }
      ];

      // Run mapDataToRange once and use the same result for all tests
      const result = mapDataToRange(issueData, dateRange);
      dailyData = result.dailyData;
      weeklyData = result.weeklyData;
      monthlyData = result.monthlyData;
    });

    it('should correctly map issues to each day they are open', function () {
      const day1 = dailyData.find(d => d.date === '2024-10-01');
      const day2 = dailyData.find(d => d.date === '2024-10-02');

      expect(day1.openIssues).to.equal(1);
      expect(day1.open_issues_info['1'].name).to.equal('Short Issue in October');
      expect(day2.openIssues).to.equal(0);
    });

    it('should correctly take a snapshot at the end of each week (Sunday)', function () {
      // Weekly data is captured on Sundays (dateObj.getDay() === 0).
      const sundayEntry = weeklyData.find(d => d.date === '2024-10-06');

      expect(sundayEntry).to.exist;
      expect(sundayEntry.openIssues).to.be.at.least(1);
      expect(sundayEntry.open_issues_info['2'].name).to.equal('Issue crossing Sunday');

      expect(weeklyData.length).to.equal(13);
    });

    it('should correctly take a snapshot at the end of each month', function () {
      // Monthly data is taken on the last day of each month.
      const octoberLastDay = monthlyData.find(d => d.date === '2024-10-31');
      expect(octoberLastDay).to.exist;
      expect(octoberLastDay.openIssues).to.be.at.least(1);
      expect(octoberLastDay.open_issues_info['3'].name).to.equal('Issue crossing month boundary');

      const decemberLastDay = monthlyData.find(d => d.date === '2024-12-31');
      expect(decemberLastDay).to.exist;
      expect(decemberLastDay.openIssues).to.be.at.least(1);
      expect(decemberLastDay.open_issues_info['4'].name).to.equal(
        'Long issue (December to January)'
      );

      expect(monthlyData.length).to.equal(3);
    });
  });
});
