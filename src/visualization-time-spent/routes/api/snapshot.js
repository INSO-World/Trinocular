import { sendSchedulerCallback } from '../../../common/index.js';
import {
  getDatasourceForRepositoryFromApiBridge
} from '../../lib/requests.js';
import {
  insertIssuesIntoDatabase, insertMembersIntoDatabase,
  insertRepoDetailsIntoDatabase,
  insertTimelogsIntoDatabase
} from '../../lib/database.js';
import { logger } from "../../../common/index.js";

export async function postSnapshot(req, res) {
  const { transactionId } = req.query;
  const uuid = req.params.uuid;

  res.sendStatus(200);

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
    return null;
  }

  const { timelogsError, data: timelogData } = await getDatasourceForRepositoryFromApiBridge(
    'timelogs',
    uuid
  );

  if (timelogsError) {
    logger.error(timelogsError);
    return null;
  }

  const { membersError, data: memberData } = await getDatasourceForRepositoryFromApiBridge(
    'members',
    uuid
  );

  if (membersError) {
    logger.error(membersError);
    return null;
  }

  // 4. Store data in database
  await insertIssuesIntoDatabase(uuid, issueData);
  await insertTimelogsIntoDatabase(uuid, timelogData);
  await insertMembersIntoDatabase(uuid, memberData);


  // 5. Send callback
  logger.info(`Visualization '${process.env.SERVICE_NAME}' created snapshot for repository '${uuid}'`);
  await sendSchedulerCallback(transactionId, 'ok');
}
