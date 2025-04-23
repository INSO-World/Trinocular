import {
  getDatasourceForRepositoryFromApiBridge,
  getRepositoryForUuid
} from '../../lib/requests.js';
import { getDynamicDateRange, mapDataToRange } from '../../lib/burndown-chart-utils.js';
import { logger, withSchedulerCallback } from '../../../common/index.js';
import { insertBurndownChartData, insertIssues } from '../../lib/database.js';

export async function postSnapshot(req, res) {
  const { transactionId } = req.query;
  const uuid = req.params.uuid;

  res.sendStatus(200);

  await withSchedulerCallback(
    transactionId,
    async () => {
      // 1. Fetch all repos from api-bridge
      const { getRepoError, data } = await getRepositoryForUuid(uuid);
      const repo = data[0];
      if (getRepoError) {
        logger.error(getRepoError);
        throw Error('Could not get repository from Api Bridge: ' + getRepoError);
      }

      // 2. Fetch issues from api-bridge
      const { getDataSourceError, data: issueData } = await getDatasourceForRepositoryFromApiBridge(
        'issues',
        uuid
      );

      if (getDataSourceError) {
        logger.error(getDataSourceError);
        throw Error('Could not get issues from Api Bridge: ' + getDataSourceError);
      }

      // 3. Process issues to get burndown data
      const dataRange = getDynamicDateRange(issueData, repo);
      const filledData = mapDataToRange(issueData, dataRange);

      issueData.forEach(issue => {
        issue.closed_at = issue.closed_at ? issue.closed_at : new Date();
      });

      // 4. Store burndown data in database
      const insertPromises = [
        insertBurndownChartData(uuid, filledData.dailyData, 'day'),
        insertBurndownChartData(uuid, filledData.weeklyData, 'week'),
        insertBurndownChartData(uuid, filledData.monthlyData, 'month'),
        insertIssues(uuid, issueData)
      ];

      await Promise.all(insertPromises);

      // 5. Send callback
      logger.info(`Visualization '${process.env.SERVICE_NAME}' creates snapshot for uuid: ${uuid}`);
    },
    e =>
      Error(
        `Could not create '${process.env.SERVICE_NAME}' visualization snapshot for uuid: ${uuid}`,
        { cause: e }
      )
  );
}
