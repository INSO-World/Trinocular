import { logger } from '../../../common/index.js';
import { getAllRepos } from '../../lib/database.js';
import { resetRepositoryEverywhere, submitSchedulerTask } from '../../lib/requests.js';

export async function reimportRepositories(req, res) {

  logger.info('Reimporting all active repositories');

  // Reset and snapshot all active repos
  const activeRepos= getAllRepos(true);
  for( const { uuid } of activeRepos ) {

    const resetError= await resetRepositoryEverywhere( uuid );
    if( resetError ) {
      logger.error(`Could not re-import repo '${uuid}' due to: %s`, resetError);
      continue;
    }
    
    // Run scheduler task now without callback
    const transactionId = await submitSchedulerTask( uuid );
    if (!transactionId) {
      logger.error(`Could not re-import repo '${uuid}' due to: Could not submit import task`);
    }
  }

  res.sendStatus(200);
}
