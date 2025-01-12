import { repositoryIsCurrentlyImporting } from '../lib/currently-importing.js';
import { visualizations } from '../lib/visualizations.js';
import { getRepoDashboardConfig, getRepositoryByUuid } from '../lib/database.js';
import { ErrorMessages } from '../lib/error-messages.js';
import { getDatasourceForRepoFromAPIService, getRepositoryFromRepoService } from '../lib/requests.js';
import { createToken } from '../lib/csrf.js';

function stringEqualsIgnoreCase(a, b) {
  return a.localeCompare(b, undefined, { sensitivity: 'accent' }) === 0;
}

function dateInputValueString(date) {
  return date instanceof Date ? date.toISOString().substring(0, 10) : date;
}

/**
 * 
 * @param {{name: string}[]} apiMembers 
 * @param {{authorName: string, email: string}[]} contributors 
 * @returns {Map<string, {authorName: string, email: string}[]>}
 */
function matchMembersAndContributors(apiMembers, contributors) {
  const matchedContributors = new Map();
  
  // Initialize matchedContributors with API members
  for(const member of apiMembers) {
    matchedContributors.set(member.name, []);
  }

  // Create 'Other' for later manual merging
  matchedContributors.set('Other', []);

  // Match contributors to API members or create new top-level entries for unmatched contributors
  for(const contributor of contributors) {
    const {authorName, email}= contributor;
    const contributorEntry= { authorName, email };
    
    // Check if there is a member with the same name as the contributor 
    const match = apiMembers.find(member => stringEqualsIgnoreCase(member.name, authorName));
    if (match) {
      // Assign the contributor to the member
      matchedContributors.get(match.name).push(contributorEntry);
      
    } else {
      // Create a new top-level member group for the unmatched author
      let group= matchedContributors.get(authorName);
      if (!group) {
        group= [];
        matchedContributors.set(authorName, group);
      }

      // Add the contributor to the new group
      group.push(contributorEntry);
    }
    
  }

  return matchedContributors;
}

/**
 * @param {{memberName: string, contributors: {authorName: string, email: string}[]}[]} previousGroups
 * @param {Map<string, {authorName: string, email: string}[]>} currentGroups 
 * @returns {Map<string, {authorName: string, email: string}[]>}
 */
function combineCurrentWithPreviousMemberGroups(previousGroups, currentGroups) {
  const previousEmailReverseMap= new Map();

  // Build a map that stores where each existing contributor used to be
  for(const {memberName, contributors} of previousGroups) {
    for( const contributor of contributors ) {
      previousEmailReverseMap.set(contributor.email, memberName);
    }
  };

  // Initialize the merged groups map with all new members
  const mergedGroups= new Map();
  currentGroups.forEach((_, memberName) => {
    mergedGroups.set(memberName, []);
  });


  // Go through all new contributors and try to place them where
  // they used to be, if this is not possible keep the location the
  // same as in the new groups map
  currentGroups.forEach((contributors, memberName) => {
    for( const contributor of contributors ) {
      // Check if we know the previous location of the contributor, and
      // whether this member still exists
      const previousLocation= previousEmailReverseMap.get(contributor.email);
      if( previousLocation && mergedGroups.has(previousLocation) ) {
        mergedGroups.get(previousLocation).push(contributor);
      } else {
        mergedGroups.get(memberName).push(contributor);
      }
    }
  });

  return mergedGroups;
}

function prepareMemberGroups(gitRepoData, apiMembers, userUuid, repoUuid, mergingConfig) {
  // Get the existing author merging config from the db and insert them into a map
  if(!mergingConfig) {
    console.warn(`No existing merging config for repository ${repoUuid} and user ${userUuid}`);
  }

  // Match and merge members and contributor data
  const currentMemberGroups= matchMembersAndContributors(apiMembers, gitRepoData.contributors);
  const mergedMemberGroups= combineCurrentWithPreviousMemberGroups(mergingConfig || [], currentMemberGroups);

  // Turn the map of merged member groups back into a sorted array
  const memberGroupsArray= [];
  mergedMemberGroups.forEach((contributors, memberName) => memberGroupsArray.push({contributors, memberName}));
  memberGroupsArray.sort((a, b) => {
    // Do case in-sensitive comparison
    return a.memberName.localeCompare(b.memberName, undefined, { sensitivity: 'accent' });
  });

  return memberGroupsArray;
}

  function prepareMilestones(milestones, customMilestones) {
    // Mark all milestones from GitHub (sent by the API bridge) as non-custom
    for( const milestone of milestones ) {
      milestone.isCustom= false;
      milestone.due_date= dateInputValueString( new Date( milestone.due_date ) );
    }

    // Mark all milestones from the db as custom and add them to the array of milestones
    if( Array.isArray(customMilestones) ) {
      for( const milestone of customMilestones ) {
        milestone.isCustom= true;
        milestone.due_date= dateInputValueString( new Date( milestone.due_date ) );
        milestones.push( milestone );
      }
    }
  }
  

export async function dashboard(req, res) {
  // Redirect to the waiting page in case we are currently importing the
  // repository for the first time
  const userUuid = req.user.sub;
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

  // Load data for common controls
  let dataSourceResponses;
  const [gitRepoData, apiMembers, milestones, repoDetails]= dataSourceResponses= await Promise.all([
    getRepositoryFromRepoService(repoUuid),
    getDatasourceForRepoFromAPIService('members', repoUuid),
    getDatasourceForRepoFromAPIService('milestones', repoUuid),
    getDatasourceForRepoFromAPIService('details', repoUuid)
  ]);
  
  const dataSourceError= dataSourceResponses.some( r => r.error );
  if( dataSourceError ) {
    console.error(`Could not load common control data from one or more data sources: ${dataSourceError}`);
    return res.status(404).render('error', {
      user: req.user,
      isAuthenticated: req.isAuthenticated(),
      errorMessage: 'Could not load data for dashboard',
      backLink: '/repos'
    });
  }

  const branchNames = gitRepoData.branchNames.sort();

  // Get dashboard config from the db
  const dashboardConfig= getRepoDashboardConfig(userUuid, repoUuid);

  // Prepare member groups
  const mergingConfig= dashboardConfig?.mergedAuthors;
  const memberGroups = prepareMemberGroups(gitRepoData, apiMembers, userUuid, repoUuid, mergingConfig);

  // Prepare milestones
  prepareMilestones(milestones, dashboardConfig?.milestones);

  // sort alphabetically so that the visualizations are always in the same order
  const visArray = [...visualizations.values()].sort((a, b) => {
    return a.displayName <= b.displayName ? -1 : 1;
  });

  const defaultVisualization = visArray[0];

  const timeSpanMin= dateInputValueString( new Date(repoDetails[0].created_at) || new Date(0) );
  const timeSpanMax= dateInputValueString( new Date(repoDetails[0].updated_at) || new Date()  );

  res.render('dashboard', {
    visualizations: visArray,
    branches: branchNames,
    defaultVisualization,
    repoUuid,
    repoName,
    memberGroups,
    timeSpanMin,
    timeSpanMax,
    milestones,
    csrfToken: createToken(req.sessionID),
    scriptSource: '/static/dashboard.js'
  });
}
