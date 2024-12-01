import { repositories, Repository } from '../lib/repository.js';
import Joi from 'joi';
import { insertNewRepositoryAndSetIds, removeRepositoryByUuid, updateRepositoryInformation } from '../lib/database.js';

const repositoryValidator = Joi.object({
  name: Joi.string().max(100).required(),
  type: Joi.string().max(50).valid('gitlab', 'github').required(),
  gitUrl: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .max(255)
    .required(),
  uuid: Joi.string().uuid().required()
});

export async function getRepository(req, res) {
  const { uuid } = req.params;
  const repo = repositories.get(uuid);
  if (!repo) {
    res.sendStatus(404).send(`No repository found with uuid: ${uuid}`);
  }

  res.json(repo);
}

/**
 *  A new repository is created in our system,
 *  name, type, uuid and GitUrl are saved in the database for further
 *  processing (e.g. clone by the scheduler)
 */
export async function postRepository(req, res) {
  req.body.uuid = req.params.uuid;

  // body: {name: name, type: 'gitlab', gitUrl: urlToClone}
  const { value, error } = repositoryValidator.validate(req.body);
  if (error) {
    console.log('Post Repository: Validation error', error);
    return res.status(422).send(error.details || 'Validation error');
  }
  const { name, type, gitUrl, uuid } = value;
  const repository = new Repository(name, null, uuid, gitUrl, type, [], []);

  try {
    await insertNewRepositoryAndSetIds(repository);
  } catch (error) {
    console.log('Post Repository: error', error);
    return res.status(409).end(`Duplicate repository UUID '${uuid}'`);
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
  const { name, type, gitUrl, uuid } = value;
  
  const repo = repositories.get(uuid);
  if(!repo) {
    res.sendStatus(404).send(`No repository found with uuid: ${uuid}`);
  }

  // Update cached data
  repo.name = name;
  repo.type = type;
  repo.gitUrl = gitUrl;

  await updateRepositoryInformation(repo); // Update in DB

  res.sendStatus(200);
}


export async function deleteRepository(req, res) {
  const uuid = req.params.uuid;
  const repo = repositories.get(uuid);
  if( !repo ) {
    return res.status(404).end(`Unknown repository UUID '${uuid}'`);
  }

  // delete from cached map
  repositories.delete(uuid);

  await removeRepositoryByUuid(uuid); // Delete in DB

  await repo.gitView.removeLocalFiles();

  res.sendStatus(204);
}
