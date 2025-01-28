import Joi from 'joi';
import { repositories, Repository } from '../lib/repository.js';
import {
  getAllCommitHashes,
  insertCommits,
  insertContributors,
  insertRepoSnapshot,
  insertRepoSnapshotEndTime,
  persistBranchSnapshot
} from '../lib/database.js';
import { GitView } from '../lib/git-view.js';
import { sendSchedulerCallback, withSchedulerCallback } from '../../common/index.js';
import { clientWithTransaction } from '../../postgres-utils/index.js';
import {logger} from "../../common/index.js";
import { Timing } from '../lib/timing.js';

const uuidValidator = Joi.string().uuid();
const currentlyUpdatingRepos = new Set();

export async function postSnapshot(req, res) {
  const { transactionId } = req.query;
  if (!transactionId) {
    return res.status(422).send('No transactionId provided');
  }

  const uuid = req.params.uuid;
  const { value, error } = uuidValidator.validate(uuid);
  if (error) {
    logger.info('Post Snapshot: Validation error: %s', error);
    return res.status(422).send(error.details || 'Validation error');
  }

  const repository = repositories.get(value); // check if the repo is currently cached
  if (!repository) {
    return res.status(404).send('No such repository with uuid: ' + value);
  }

  // Check if there is currently a snapshot being made for this repo
  if (currentlyUpdatingRepos.has(uuid)) {
    res.sendStatus(202, `The repository update for '${uuid}' is already in progress`);
    await sendSchedulerCallback(transactionId, 'error', 'Snapshot already in progress');
    return;
  }

  currentlyUpdatingRepos.add(uuid);

  // End Handler before doing time-expensive tasks
  res.sendStatus(200);

  await withSchedulerCallback(transactionId, async () => {
    await createSnapshot(repository);
    logger.info(`Done creating snapshot for repository '${uuid}'`);
  }, 
    e => Error(`Could not perform snapshot for repository '${uuid}'`, {cause: e})
  );


  // Remove from updatingRepos set
  currentlyUpdatingRepos.delete(uuid);
}

/**
 * @param {Repository} repository 
 * @param {Timing} timing 
 */
function logStatistics( repository, timing ) {
  const totalTime= timing.totalTime();
  const pullTime= timing.measure('start', 'pull');
  const pullPercent= Math.round(100 * pullTime / totalTime);

  const contributorTime= timing.measure('pull', 'contributor');
  const contributorPercent= Math.round(100 * contributorTime / totalTime);
  
  const commitTime= timing.measure('contributor', 'commit');
  const commitPercent= Math.round(100 * commitTime / totalTime);
  
  const repositoryTime= timing.measure('commit', 'repository');
  const repositoryPercent= Math.round(100 * repositoryTime / totalTime);

  logger.info(`Inserted new repository '${repository.uuid}' in ${totalTime}ms (pull: ${pullTime}ms (${pullPercent}%), contributor: ${contributorTime}ms (${contributorPercent}%), commit: ${commitTime}ms (${commitPercent}%), repository: ${repositoryTime}ms (${repositoryPercent}%))`);
}

/**
 * @param {Repository} repository
 */
async function createSnapshot(repository) {
  const timing= new Timing();
  timing.push('start');

  // Clone or Open the repository
  const gitView = await repository.loadGitView();
  await gitView.pullAllBranches();
  timing.push('pull');

  await createContributorSnapshot(gitView, repository);
  timing.push('contributor');

  await createCommitSnapshot(gitView, repository);
  timing.push('commit');

  const repoSnapshotId = await createRepositorySnapshot(repository, timing.get('start'));

  // Do blame stuff?

  timing.push('end');
  await insertRepoSnapshotEndTime(repoSnapshotId, timing.get('end'));
  timing.push('repository');

  logStatistics( repository, timing );
}

/**
 * @param {Repository} repository
 * @param {Date} startTime
 * @returns {number} repoSnapshotId
 */
async function createRepositorySnapshot(repository, startTime) {
  const gitView = await repository.loadGitView();

  const branchList = await gitView.getAllBranches();

  //update branchNames in repository
  repository.addBranches(branchList);

  let repoSnapshotId;
  await clientWithTransaction(async client => {
    repoSnapshotId = await insertRepoSnapshot(client, repository, startTime);

    for (const branchName of branchList) {
      const commits = await gitView.getCommitHashesOfBranch(branchName);
      await persistBranchSnapshot(client, repoSnapshotId, branchName, commits);
    }
  });

  return repoSnapshotId;
}

/**
 * @param {GitView} gitView
 * @param {Repository} repository
 */
async function createContributorSnapshot(gitView, repository) {
  const contributors = await gitView.getAllContributors();
  repository.addContributors(contributors);
  await insertContributors(repository);
}

/**
 * @param {GitView} gitView
 * @param {Repository} repository
 */
async function createCommitSnapshot(gitView, repository) {
  // Retrieve all commits hashes from all branches
  const currentHashes = await gitView.getAllCommitHashes();

  // Get old commit hashes from DB
  const oldHashes = await getAllCommitHashes(repository);

  // Items in currentHashes that are not in oldHashes
  const newHashes = currentHashes.filter(hash => !oldHashes.has(hash));

  // Fetch additional Info of newHashes
  const commitInfos = await Promise.all(newHashes.map(hash => gitView.getCommitInfoByHash(hash)));

  // Get contributor DbId for each commit
  const contributorMap = new Map();
  repository.contributors.forEach(c => contributorMap.set(c.email, c.dbId));
  commitInfos.forEach(commit => (commit.contributorDbId = contributorMap.get(commit.authorEmail)));

  await insertCommits(commitInfos);
}
