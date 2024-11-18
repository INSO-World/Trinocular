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
    //TODO redirect to repo list or show error "repo with uuid not found"
    console.error(`Repository with uuid: ${repoUuid} not found: ${e.message}`);
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
