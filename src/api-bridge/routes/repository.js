import Joi from 'joi';
import { ApiBridge } from '../lib/api-bridge.js';
import { Repository } from '../lib/repository.js';
import { CRUDError } from '../lib/exceptions.js';

const repositoryValidator = Joi.object({
  name: Joi.string().trim().allow(null).required(),
  uuid: Joi.string().uuid().required(),
  type: Joi.string().valid('gitlab', 'github').required(),
  url: Joi.string().uri().required(),
  authToken: Joi.string().required()
})
  .unknown(false)
  .required();

export function getAllRepositories(req, res) {
  const repos = [...ApiBridge.the().repos.values()];
  res.json(repos);
}

export function getRepository(req, res) {
  const { uuid } = req.params;
  const repo = ApiBridge.the().repos.get(uuid);
  if (!repo) {
    res.sendStatus(404);
  }

  res.json(repo);
}

export async function postRepository(req, res) {
  const { value, error } = repositoryValidator.validate(req.body);
  if (error) {
    console.log('Post Repository: Validation error', error);
    res.status(422).send(error.details || 'Validation error');
    return;
  }

  const { name, uuid, type, url, authToken } = value;
  const repo = new Repository(name, uuid, -1, type, authToken, url);

  // Do a view quick tests if the repo auth token is ok
  // This also checks whether we can use the API at all
  try {
    const authTokenResp = await repo.api().checkAuthToken();
    if (authTokenResp.status !== 200) {
      return res.status(400).end(authTokenResp.message);
    }

    // Load the name of the repo via the API if the name is set to null
    if (!repo.name) {
      repo.name = await repo.api().loadPublicName();
    }
  } catch (e) {
    console.error('Could not setup API access:', e);

    return res.status(400).end(`Cannot access Repository API: ${e}`);
  }

  const success = await ApiBridge.the().addRepo(repo);
  if (!success) {
    console.error(
      `Could not create new repository '${repo.name}'. URL or uuid duplicated. (uuid ${repo.uuid})`
    );
    return res.status(409).end(`Duplicate repository URL or UUID (url: '${url}', uuid: '${uuid}')`);
  }

  console.log(`Successfully created new repository '${repo.name}' (uuid ${repo.uuid})`);

  res.json(repo);
}

export async function putRepository(req, res) {
  const { uuid } = req.params;
  req.body.uuid = uuid;
  const { value, error } = repositoryValidator.validate(req.body);
  if (error) {
    console.log('Put Repository: Validation error', error);
    res.status(422).send(error.details || 'Validation error');
    return;
  }

  const { name, uuid: jsonUuid, type, url, authToken } = value;
  if (uuid !== jsonUuid) {
    return res.status(422).end(`Repository UUID mismatch (path: '${uuid}', body: '${jsonUuid}')`);
  }

  // Disallow missing names when updating settings
  if (!repo.name) {
    return res.status(422).end(`Repository name is required`);
  }

  // Do a view quick tests if the repo auth token is ok
  const repo = new Repository(name, uuid, -1, type, authToken, url);
  const authTokenResp = await repo.api().checkAuthToken();
  if (authTokenResp.status !== 200) {
    return res.status(400).end(authTokenResp.message);
  }

  try {
    await ApiBridge.the().updateRepo(repo);
  } catch (e) {
    if (e instanceof CRUDError) {
      return res.status(e.statusCode).end(e.message);
    }

    console.error('Could not update repo:', e);
    return res.status(500).end(`Internal Error: ${e.message}`);
  }

  res.json(repo);
}

export async function deleteRepository(req, res) {
  const { uuid } = req.params;

  const success = await ApiBridge.the().removeRepo(uuid);
  if (!success) {
    return res.status(404).end(`Unknown repository UUID '${uuid}'`);
  }

  console.log(`Successfully deleted repository with uuid ${uuid}`);
  res.sendStatus(200);
}
