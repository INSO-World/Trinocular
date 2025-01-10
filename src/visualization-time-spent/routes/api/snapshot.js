import { sendSchedulerCallback } from '../../../common/index.js';
import {
  getAllRepositories,
  getDatasourceForRepositoryFromApiBridge,
  getRepositoryForUuid
} from '../../lib/requests.js';
import { formatInsertManyValues, pool } from '../../../postgres-utils/index.js';
import {
  insertIssuesIntoDatabase, insertMembersIntoDatabase,
  insertRepoDetailsIntoDatabase,
  insertTimelogsIntoDatabase
} from '../../lib/database.js';

export async function postSnapshot(req, res) {
  // TODO validate parameters
  const { transactionId } = req.query;
  const uuid = req.params.uuid;

  res.sendStatus(200);

  //TODO remove all testing logging output

  // 1. Fetch repo with uuid from api-bridge
  const repoDetails = await getRepositoryForUuid(uuid);
  console.log('repoDetails', repoDetails);
  await insertRepoDetailsIntoDatabase(uuid, repoDetails);

  // 2. Fetch issues from api-bridge
  const { issuesError, data: issueData } = await getDatasourceForRepositoryFromApiBridge(
    'issues',
    uuid
  );

  if (issuesError) {
    console.error(issuesError);
    return null;
  }

  const { timelogsError, data: timelogData } = await getDatasourceForRepositoryFromApiBridge(
    'timelogs',
    uuid
  );

  if (timelogsError) {
    console.error(timelogsError);
    return null;
  }

  const { membersError, data: memberData } = await getDatasourceForRepositoryFromApiBridge(
    'members',
    uuid
  );

  if (membersError) {
    console.error(membersError);
    return null;
  }

  console.table(memberData);

  // 4. Store data in database
  await insertIssuesIntoDatabase(uuid, issueData);
  await insertTimelogsIntoDatabase(uuid, timelogData);
  await insertMembersIntoDatabase(uuid, memberData);


  // 5. Send callback
  console.log(`Visualization '${process.env.SERVICE_NAME}' creates snapshot...`);

  await sendSchedulerCallback(transactionId, 'ok');
}
