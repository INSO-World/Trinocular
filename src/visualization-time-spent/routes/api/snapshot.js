import { sendSchedulerCallback, withSchedulerCallback } from '../../../common/index.js';
import { getDatasourceForRepositoryFromApiBridge } from '../../lib/requests.js';
import {
  insertIssuesIntoDatabase,
  insertMembersIntoDatabase,
  insertRepoDetailsIntoDatabase,
  insertTimelogsIntoDatabase
} from '../../lib/database.js';
import { logger } from '../../../common/index.js';

export async function postSnapshot(req, res) {
  const { transactionId } = req.query;
  const uuid = req.params.uuid;

  res.sendStatus(200);

  await withSchedulerCallback(
    transactionId,
    async () => {
      // 1. Fetch repo with uuid from api-bridge
      const repoDetails = await getDatasourceForRepositoryFromApiBridge('details', uuid);
      await insertRepoDetailsIntoDatabase(uuid, repoDetails);

      // 2. Fetch issues from api-bridge
      const { issuesError, data: issueData } = await getDatasourceForRepositoryFromApiBridge(
        'issues',
        uuid
      );

      if (issuesError) {
        logger.error(issuesError);
        throw Error('Could not get issues from Api Bridge: ' + issuesError);
      }

      const { timelogsError, data: timelogData } = await getDatasourceForRepositoryFromApiBridge(
        'timelogs',
        uuid
      );

      if (timelogsError) {
        logger.error(timelogsError);
        throw Error('Could not get timelogs from Api Bridge: ' + timelogsError);
      }

      const { membersError, data: memberData } = await getDatasourceForRepositoryFromApiBridge(
        'members',
        uuid
      );

      if (membersError) {
        logger.error(membersError);
        throw Error('Could not get members from Api Bridge: ' + membersError);
      }

      // 4. Store data in database
      await insertIssuesIntoDatabase(uuid, issueData);
      await insertTimelogsIntoDatabase(uuid, timelogData);
      await insertMembersIntoDatabase(uuid, memberData);

      logger.info(`Visualization '${process.env.SERVICE_NAME}' creates snapshot for uuid: ${uuid}`);
    },
    e =>
      Error(
        `Could not create '${process.env.SERVICE_NAME}' visualization snapshot for uuid: ${uuid}`,
        { cause: e }
      )
  );
}
