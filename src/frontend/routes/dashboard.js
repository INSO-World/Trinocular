import { visualizations } from '../lib/visualizations.js';

export function dashboard(req, res) {
  const repoUuid= req.params.repoUuid;
  const repoName= `repo-${repoUuid}`;

  const visArray= [...visualizations.values()];
  const defaultVisualization= visArray[0];

  res.render('dashboard', {
    visualizations: visArray,
    defaultVisualization,
    repoUuid,
    repoName,
    scriptSource: '/static/dashboard.js'
  });
}
