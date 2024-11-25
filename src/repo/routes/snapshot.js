import Joi from 'joi';
import { repositories, Repository } from '../lib/repository.js';
import { getAllCommitHashes, insertCommits, updateRepositoryInformation } from '../lib/database.js';
import { GitView } from '../lib/git-view.js';
import { sendSchedulerCallback } from '../../common/scheduler.js';

const uuidValidator = Joi.string().uuid();

export async function postSnapshot(req, res) {
  const { transactionId } = req.query;
  if (!transactionId) {
    return res.status(422).send('No transactionId provided');
  }

  const uuid = req.params.uuid;
  const { value, error } = uuidValidator.validate(uuid);
  if (error) {
    console.log('Post Snapshot: Validation error', error);
    return res.status(422).send(error.details || 'Validation error');
  }

  const repository = repositories.get(value); // check if the repo is currently cached
  if (!repository) {
    return res.status(404).send('No such repository with uuid: ' + value);
  }

  // End Handler before doing time-expensive tasks
  res.sendStatus(200);

  let success = false;
  try {
    //await createSnapshot( repository );
    success = true;
  } catch (e) {
    console.error(`Could not perform snapshot for repository '${uuid}':`, e);
    success = false;
  } finally {
    // TODO: In case of error also send a error message back to the scheduler
    await sendSchedulerCallback(transactionId, success ? 'ok' : 'error');
  }
}

/**
 * @param {Repository} repository
 */
async function createSnapshot(repository) {
  // Clone or Open the repository
  const gitView = await repository.loadGitView();

  await gitView.pullAllBranches();

  // TODO: Also update Repository information together with members and contributors

  // TODO: get Members from API --> in repository cache legen
  // repository.addMembers(members);

  const contributors = await gitView.getAllContributors();
  repository.addAndUpdateContributors(contributors);

  await updateRepositoryInformation(repository);

  const commitInfos = await getCommitInfos(gitView, repository);
  await insertCommits(commitInfos);

  // TODO: Create repo & branch snapshots

  // Do blame stuff?

  // Done?
}

/**
 *
 * @param {GitView} gitView
 * @param {Repository} repository
 * @returns
 */
async function getCommitInfos(gitView, repository) {
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

  return commitInfos;
}
