import { repositories, Repository } from '../lib/repository.js';
import Joi from 'joi';
import {
  insertNewRepositoryAndSetIds,
  removeRepositoryByUuid,
  updateRepositoryInformation,
  getCommitsPerContributor
} from '../lib/database.js';

const repositoryValidator = Joi.object({
  name: Joi.string().max(100).required(),
  type: Joi.string().max(50).valid('gitlab', 'github').required(),
  gitUrl: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .max(255)
    .required(),
  uuid: Joi.string().uuid().required(),
  authToken: Joi.string().required()
});

const uuidValidator = Joi.string().uuid().required();

export async function getRepository(req, res) {
  const { value: uuid, error } = uuidValidator.validate(req.params.uuid);
  if (error) {
    console.log('Post Repository: Validation error', error);
    return res.status(422).send(error.details || 'Validation error');
  }

  const repo = repositories.get(uuid);
  if (!repo) {
    res.sendStatus(404).send(`No repository found with uuid: ${uuid}`);
  }

  // The git-view can not be stringified as JSON
  const gitView = repo.gitView;
  repo.gitView = null;
  try {
    res.json(repo);
  } finally {
    repo.gitView = gitView;
  }
}

/**
 *  A new repository is created in our system,
 *  name, type, uuid and GitUrl are saved in the database for further
 *  processing (e.g. clone by the scheduler)
 */
export async function postRepository(req, res) {
  req.body.uuid = req.params.uuid;

  const { value, error } = repositoryValidator.validate(req.body);
  if (error) {
    console.log('Post Repository: Validation error', error);
    return res.status(422).send(error.details || 'Validation error');
  }
  const { name, type, gitUrl, uuid, authToken } = value;
  const repository = new Repository(name, null, uuid, gitUrl, type, [], [], undefined);

  try {
    await insertNewRepositoryAndSetIds(repository);
  } catch (error) {
    if(error.code === 23505) {
      console.log('Post Repository: error', error);
      return res.status(409).end(`Duplicate repository UUID '${uuid}'`);
    }

    console.log('Post Repository: SQL error', error);
    return res.status(500).end(`SQL insertion error for repository UUID '${uuid}'`);
  }

  // Cache repository in the Map
  repositories.set(uuid, repository);

  res.sendStatus(201);
}

/**
 *  An existing repository is updated in our system
 */
export async function putRepository(req, res) {
  req.body.uuid = req.params.uuid;

  // body: {name: name, type: 'gitlab', gitUrl: urlToClone}
  const { value, error } = repositoryValidator.validate(req.body);
  if (error) {
    console.log('Put Repository: Validation error', error);
    return res.status(422).send(error.details || 'Validation error');
  }
  const { name, type, gitUrl, uuid, authToken } = value;

  const repo = repositories.get(uuid);
  if (!repo) {
    res.sendStatus(404).send(`No repository found with uuid: ${uuid}`);
  }

  // Update cached data
  repo.name = name;
  repo.type = type;
  repo.gitUrl = gitUrl;
  repo.authToken = authToken;

  await updateRepositoryInformation(repo); // Update in DB

  res.sendStatus(200);
}

export async function deleteRepository(req, res) {
  const { value: uuid, error } = uuidValidator.validate(req.params.uuid);
  if (error) {
    console.log('Post Repository: Validation error', error);
    return res.status(422).send(error.details || 'Validation error');
  }

  const repo = repositories.get(uuid);
  if (!repo) {
    return res.status(404).end(`Unknown repository UUID '${uuid}'`);
  }

  // delete from cached map
  repositories.delete(uuid);

  await removeRepositoryByUuid(uuid); // Delete in DB

  const gitView = await repo.loadGitView();
  await gitView.removeLocalFiles();

  console.log(`Sucessfully deleted repository with uuid: ${uuid}`);
  res.sendStatus(204);
}


export async function getCommitStats(req, res) {

  const { value: uuid, error } = uuidValidator.validate(req.params.uuid);
  if (error) {
    console.log('Post Repository: Validation error', error);
    return res.status(422).send(error.details || 'Validation error');
  }

  const repo = repositories.get(uuid);
  if (!repo) {
    return res.status(404).end(`Unknown repository UUID '${uuid}'`);
  }

  // get branch and contributor from query parameter
  const { branch: branchName, startTime, endTime, contributorEmails, contributorUuids } = req.query;

  let contributorDbIds; 
  // Contributor can be either email or uuid --> split at ","
  if(contributorEmails && contributorUuids) {
    return res.status(400).end(`Cannot specify contributor Emails and UUIDs at once`);
  
  } else if(contributorEmails) {
    const emails = contributorEmails.split(","); 

    contributorDbIds = repo.contributors.filter(
      contributor => emails.includes(contributor.email)
    ).map(contributor => contributor.dbId);
  
  } else if(contributorUuids) {
    const uuids = contributorUuids.split(","); 

    contributorDbIds = repo.contributors.filter(
      contributor => uuids.includes(contributor.uuid)
    ).map(contributor => contributor.dbId);
  
  } else {
    contributorDbIds = repo.contributors.map(contributor => contributor.dbId);
  }

  if(!contributorDbIds.length) {
    return res.status(404).end(`Could not find any matching contributors`);
  }

  // call database function to fetch the data from DB
  const result = await getCommitsPerContributor(repo, startTime, endTime, branchName, contributorDbIds );

  return res.json(result);  
}
