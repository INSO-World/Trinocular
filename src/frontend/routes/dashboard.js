import { repositoryIsCurrentlyImporting } from '../lib/currently-importing.js';
import { visualizations } from '../lib/visualizations.js';
import { getRepositoryByUuid } from '../lib/database.js';
import { ErrorMessages } from '../lib/error-messages.js';
import {getDatasourceForRepoFromAPIService, getRepositoryFromRepoService} from "../lib/requests.js";



function preMatchContributors(apiMembers, contributors) {
  const matchedContributors = {};

  // Initialize matchedContributors with API members
  apiMembers.forEach(member => {
    matchedContributors[member.name] = [];
  });


  // Match contributors to API members or create new top-level entries for unmatched contributors
  contributors.forEach(contributor => {
    const match = apiMembers.find(member => member.name.toLowerCase() === contributor.authorName.toLowerCase());

    if (match) {
      // assign the contributor to the member's list
      matchedContributors[match.name].push({
        authorName: contributor.authorName,
        email: contributor.email,
      });
    } else {
      // create a new top-level member for the unmatched author
      if (!matchedContributors[contributor.authorName]) {
        matchedContributors[contributor.authorName] = [];
      }
      matchedContributors[contributor.authorName].push({
        authorName: contributor.authorName,
        email: contributor.email,
      });
    }
  });

  // create 'Other' for later manual merging
  matchedContributors['Other'] = [];

  return matchedContributors;
}

export async function loadAuthors(repoUuid){
  // Load contributors for author merging
  const repo = await getRepositoryFromRepoService(repoUuid);
  const apiMembers = await getDatasourceForRepoFromAPIService('members', repoUuid);
  if(repo.error || apiMembers.error) {
    console.error('Could not lookup git contributors or API members');
    //TODO what do we do here?
  }

  return preMatchContributors(apiMembers,repo.contributors)
}

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

  const authors = await loadAuthors(repoUuid);

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
    matchedMembers:authors,
    scriptSource: '/static/dashboard.js'
  });
}
