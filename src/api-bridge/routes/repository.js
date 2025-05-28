import Joi from 'joi';
import { ApiBridge } from '../lib/api-bridge.js';
import { Repository } from '../lib/repository.js';
import { CRUDError } from '../lib/exceptions.js';
import { logger } from '../../common/index.js';

const repositoryValidator = Joi.object({
  name: Joi.string().trim().allow(null).required(),
  uuid: Joi.string().uuid().required(),
  type: Joi.string().valid('gitlab', 'github').required(),
  url: Joi.string().uri().required(),
  authToken: Joi.string().required(),
  isActive: Joi.boolean().default(true)
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
    logger.warning('Post Repository: Validation error: %s', error);
    res.status(422).send(error.details || 'Validation error');
    return;
  }

  const { name, uuid, type, url, authToken, isActive } = value;
  const repo = new Repository(name, uuid, -1, type, authToken, url);

  if( isActive ) {
    // Init the repository API before we persist it.
    // Then do a view quick tests if the repo auth token is ok
    // This also checks whether we can use the API at all
    try {
      const api= repo.api();
      await api.init();
      const authTokenResp = await api.checkAuthToken();
      if (authTokenResp.status !== 200) {
        return res.status(400).end(authTokenResp.message);
      }

      // Load the name of the repo via the API if the name is set to null
      if (!repo.name) {
        repo.name = await repo.api().loadPublicName();
      }
    } catch (e) {
      logger.error('Could not setup API access: %s', e);

      return res.status(400).end(`Cannot access Repository API: ${e}`);
    }
  } else if( !repo.name ) {
    repo.name= repo.api().projectIdFromUrl;
  }

  const success = await ApiBridge.the().addRepo(repo);
  if (!success) {
    logger.error(
      `Could not create new repository '${repo.name}'. URL or uuid duplicated. (uuid ${repo.uuid})`
    );
    return res.status(409).end(`Duplicate repository URL or UUID (url: '${url}', uuid: '${uuid}')`);
  }

  logger.info(`Successfully created new repository '${repo.name}' (uuid ${repo.uuid})`);

  res.json(repo);
}

export async function putRepository(req, res) {
  const { uuid } = req.params;
  req.body.uuid = uuid;
  const { value, error } = repositoryValidator.validate(req.body);
  if (error) {
    logger.info('Put Repository: Validation error: %s', error);
    res.status(422).send(error.details || 'Validation error');
    return;
  }

  const { name, uuid: jsonUuid, type, url, authToken, isActive } = value;
  if (uuid !== jsonUuid) {
    return res.status(422).end(`Repository UUID mismatch (path: '${uuid}', body: '${jsonUuid}')`);
  }

  // Disallow missing names when updating settings
  if (!name) {
    return res.status(422).end(`Repository name is required`);
  }

  const repo = new Repository(name, uuid, -1, type, authToken, url);
  
  // Re-init the API and also do a view quick tests if the repo
  // auth token is ok
  if( isActive ) {
    const api= repo.api();
    await api.init();
    const authTokenResp = await api.checkAuthToken();
    if (authTokenResp.status !== 200) {
      return res.status(400).end(authTokenResp.message);
    }
  }

  try {
    await ApiBridge.the().updateRepo(repo);
  } catch (e) {
    if (e instanceof CRUDError) {
      return res.status(e.statusCode).end(e.message);
    }

    logger.error('Could not update repo: %s', e);
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

  logger.info(`Successfully deleted repository with uuid ${uuid}`);
  res.sendStatus(200);
}
