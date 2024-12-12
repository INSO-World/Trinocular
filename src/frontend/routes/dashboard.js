import { repositoryIsCurrentlyImporting } from '../lib/currently-importing.js';
import { visualizations } from '../lib/visualizations.js';
import { getRepositoryByUuid } from '../lib/database.js';
import { ErrorMessages } from '../lib/error-messages.js';

export function dashboard(req, res) {
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
    scriptSource: '/static/dashboard.js'
  });
}
