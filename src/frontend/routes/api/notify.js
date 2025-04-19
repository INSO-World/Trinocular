import { updateVisualizationsFromRegistry } from '../../lib/visualizations.js';
import { logger } from '../../../common/index.js';
import { deleteRepositoryEverywhere } from '../settings.js';

/**
 *  Update the currently available visualizations by asking the registry
 */
export function notifyVisualization(req, res) {
  // No need to let the registry wait for us to finish -> no await here
  updateVisualizationsFromRegistry();

  res.sendStatus(200);
}

export async function notifyRepositoryImported(req, res) {
  const { status, repo } = req.query;

  if (!repo || !status) {
    logger.warning(`Invalid notify callback for import task`);
    return;
  }

  // When the initial import has failed we just delete the repository.
  // This only happens for initial imports not for scheduled update tasks, as
  // these do not perform a callback to the frontend service.
  if (status !== 'success') {
    const errorMessage= await deleteRepositoryEverywhere( repo );
    if( errorMessage ) {
      logger.error(`Could not delete repository '${repo}' after import failed: ${errorMessage}`);
      return res.sendStatus(500);
    }
  }


  res.sendStatus(200);
}
