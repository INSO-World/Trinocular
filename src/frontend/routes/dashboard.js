import { repositoryIsCurrentlyImporting } from '../lib/currently-importing.js';
import { visualizations } from '../lib/visualizations.js';

export function dashboard(req, res) {
  // Redirect to the waiting page in case we are currently importing the
  // repository for the first time
  const repoUuid= req.params.repoUuid;
  if( repositoryIsCurrentlyImporting(repoUuid) ) {
    return res.redirect(`/wait/${repoUuid}`);
  }

  // TODO: Do a db lookup for the repo name
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
