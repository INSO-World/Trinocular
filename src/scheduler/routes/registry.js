import { updateVisualizationsFromRegistry } from '../lib/visualizations.js';

export function notifyVisualization(req, res) {
  // No need to let the registry wait for us to finish -> no await here
  updateVisualizationsFromRegistry();

  res.sendStatus(200);
}
