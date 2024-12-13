import { repositoryIsCurrentlyImporting } from '../lib/currently-importing.js';
import { visualizations } from '../lib/visualizations.js';
import { getRepositoryByUuid } from '../lib/database.js';
import { ErrorMessages } from '../lib/error-messages.js';
import {getRepositoryFromRepoService} from "../lib/requests.js";
//import {initContributors} from '/static/dashboard.js';

export async function dashboard(req, res) {
  // Redirect to the waiting page in case we are currently importing the
  // repository for the first time
  const repoUuid = req.params.repoUuid;
  if (repositoryIsCurrentlyImporting(repoUuid)) {
    return res.redirect(`/wait/${repoUuid}`);
  }

  // default to uuid when no name is found in database
  let repoName = `repo-${repoUuid}`;
  try {
    const repo = getRepositoryByUuid(repoUuid);
    repoName = repo.name;
  } catch (e) {
    return res.status(404).render('error', {
      user: req.user,
      isAuthenticated: req.isAuthenticated(),
      errorMessage: ErrorMessages.NotFound('repository'),
      backLink: '/repos'
    });
  }

  // Load contributors for author merging
  const repo = await getRepositoryFromRepoService(repoUuid);
  if(repo.error) {
    console.error('Could not lookup contributors from repo service');
    //TODO what do we do here?
  }

  console.log('Contributors: ', repo.contributors);
  const contributors = repo.contributors;
  //initContributors(repo.contributors);

  // sort alphabetically so that the visualizations are always in the same order
  const visArray = [...visualizations.values()];

  visArray.sort((a, b) => {
    return a.displayName <= b.displayName ? -1 : 1;
  });

  const defaultVisualization = visArray[0];

  res.render('dashboard', {
    visualizations: visArray,
    defaultVisualization,
    repoUuid,
    repoName,
    contributors,
    scriptSource: '/static/dashboard.js'
  });
}
