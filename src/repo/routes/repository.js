import {Repository} from "../lib/repository.js";
import Joi from 'joi';
import {insertNewRepositoryAndSetIds} from "../lib/database.js";

const repositoryValidator = Joi.object({
  name: Joi.string().max(100).required(),
  type: Joi.string().max(50).valid('gitlab', 'github').required(),
  gitUrl: Joi.string().uri({ scheme: ['https']}).max(255).required()
});

export async function getRepository(req, res) {
  res.sendStatus(200);
}

/**
 *  A new repository is created in our system,
 *  name, type, uuid and GitUrl are saved in the database for further
 *  processing (e.g. clone by the scheduler)
 */
export async function postRepository(req, res) {

  const {uuid}= req.params;

  // body: {name: name, type: 'gitlab', gitURL: urlToClone}
  const {value, error}= repositoryValidator.validate( req.body );
  if( error ) {
    console.log('Post Repository: Validation error', error);
    return res.status( 422 ).send( error.details || 'Validation error' );
  }
  const {name, type, gitUrl} = value;
  const repository = new Repository(name,null, uuid,
      gitUrl, type, null, null);

  /* TODO communicate with GitLab API to get members
      or do that later when a snapshot is created
  */
  // const members= data.members.map( m => new Member( m.usernam, ... ... ) )

  try {
    await insertNewRepositoryAndSetIds( repository );
  } catch( error ) {
    console.log('Post Repository: error', error);
    return res.status( 409 ).end(`Duplicate repository UUID '${uuid}'`);
  }
  
  res.sendStatus(200);
}

