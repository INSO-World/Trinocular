import { logger } from '../../../common/index.js';
import { getAllRepos, getRepositoryByUuid } from '../../lib/database.js';
import { resetRepositoryEverywhere, submitSchedulerTask } from '../../lib/requests.js';

/**
 * Reimport a repository by first deleting its data on the services (resetting) and
 * then sending a snapshot request to the scheduler.
 * @param {string} uuid 
 * @returns {Promise<boolean>} Success
 */
async function deleteAndSnapshotRepository(uuid) {
  // Delete all the repository data from all services but keep the repository itself
  const resetError= await resetRepositoryEverywhere( uuid );
  if( resetError ) {
    logger.error(`Could not re-import repo '${uuid}' due to: %s`, resetError);
    return false;
  }
  
  // Run scheduler task now without callback
  const transactionId = await submitSchedulerTask( uuid );
  if (!transactionId) {
    logger.error(`Could not re-import repo '${uuid}' due to: Could not submit import task`);
    return false;
  }

  return true;
}


export async function snapshotRepository(req, res) {
  if( req.csrfError ) {
    return res.status(400).end('Invalid CSRF token');
  }

  const uuid= req.params.repoUuid;
  if( !getRepositoryByUuid(uuid) ) {
    return res.sendStatus(404);
  }

  logger.info(`Creating snapshot of repository ${uuid}`);

  const transactionId = await submitSchedulerTask( uuid );
  if (!transactionId) {
    logger.error(`Could not snapshot repo '${uuid}' due to: Could not submit import task`);
    return res.sendStatus(500);
  }

  res.sendStatus(200);
}

export async function reimportRepository(req, res) {
  if( req.csrfError ) {
    return res.status(400).end('Invalid CSRF token');
  }

  const uuid= req.params.repoUuid;
  if( !getRepositoryByUuid(uuid) ) {
    return res.sendStatus(404);
  }

  logger.info(`Reimporting repository ${uuid}`);

  const success= await deleteAndSnapshotRepository( uuid );
  res.sendStatus( success ? 200 : 500 );
}

export async function reimportRepositories(req, res) {
  if( req.csrfError ) {
    return res.status(400).end('Invalid CSRF token');
  }

  logger.info('Reimporting all active repositories');

  // Reset and snapshot all active repos
  const activeRepos= getAllRepos(true);
  for( const { uuid } of activeRepos ) {
    await deleteAndSnapshotRepository( uuid );
  }

  res.sendStatus(200);
}
