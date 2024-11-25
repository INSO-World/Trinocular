import { setRepositoryImportingStatus } from '../../lib/currently-importing.js';
import { updateVisualizationsFromRegistry } from '../../lib/visualizations.js';

export function notifyVisualization(req, res) {
  // No need to let the registry wait for us to finish -> no await here
  updateVisualizationsFromRegistry();

  res.sendStatus(200);
}

export function notifyRepositoryImported(req, res) {
  const { status, repo } = req.query;

  if (!repo || !status) {
    console.log(`Invalid notify callback for import task`);
    return;
  }

  if (status !== 'success') {
    // FIXME: What to do when importing fails? -> Do we just delete everything again from the DBs?
  }

  setRepositoryImportingStatus(repo, false);

  res.sendStatus(200);
}
