import { repositoryIsCurrentlyImporting } from '../lib/currently-importing.js';
import { visualizations } from '../lib/visualizations.js';
import {getRepositoryNameByUuid} from '../lib/database.js';

export function dashboard(req, res) {
  // Redirect to the waiting page in case we are currently importing the
  // repository for the first time
  const repoUuid= req.params.repoUuid;
  if( repositoryIsCurrentlyImporting(repoUuid) ) {
    return res.redirect(`/wait/${repoUuid}`);
  }

  // default to uuid when no name is found in database
  let repoName= `repo-${repoUuid}`;
  try {
    repoName= getRepositoryNameByUuid(repoUuid);
  } catch(e) {
    res.render('not-found', {
      user: req.user,
    })
    return;
  }

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
