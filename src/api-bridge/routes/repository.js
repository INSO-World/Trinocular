import Joi from 'joi';
import { ApiBridge } from '../lib/api-bridge.js';
import { Repository } from '../lib/repository.js';

const repositoryValidator= Joi.object({
  name: Joi.string().required(),
  uuid: Joi.string().uuid().required(),
  type: Joi.string().valid('gitlab', 'github').required(),
  url: Joi.string().uri().required(),
  authToken: Joi.string().required(),
}).unknown(false).required();

export function getAllRepositories( req, res ) {
  const repos= [...ApiBridge.the().repos.values()]
  res.json( repos );
}

export function getRepository( req, res ) {
  const { uuid }= req.params;
  const repo= ApiBridge.the().repos.get( uuid );
  if( !repo ) {
    res.sendStatus( 404 );
  }

  res.json( repo );
} 

export async function postRepository( req, res ) {
  const {value, error}= repositoryValidator.validate( req.body );
  if( error ) {
    console.log('Post Repository: Validation error', error);
    res.status( 422 ).send( error.details || 'Validation error' );
    return;
  }

  const {name, uuid, type, url, authToken}= value;
  const repo= new Repository(name, uuid, -1, type, authToken, url);

  const success= await ApiBridge.the().addRepo( repo );
  if( !success ) {
    return res.status( 409 ).end(`Duplicate repository URL or UUID (url: '${url}', uuid: '${uuid}')`);
  }

  res.sendStatus(200);
}

export async function putRepository( req, res ) {
  const { uuid }= req.params;
  const {value, error}= repositoryValidator.validate( req.body );
  if( error ) {
    console.log('Post Repository: Validation error', error);
    res.status( 422 ).send( error.details || 'Validation error' );
    return;
  }

  const {name, uuid: jsonUuid, type, url, authToken}= value;
  if( uuid !== jsonUuid ) {
    return res.status( 422 ).end(`Repository UUID mismatch (path: '${uuid}', body: '${jsonUuid}')`);
  }

  const repo= new Repository(name, uuid, -1, type, authToken, url);

  const success= await ApiBridge.the().updateRepo( repo );
  if( !success ) {
    return res.status( 404 ).end(`Unknown repository UUID '${uuid}'`);
  }

  res.sendStatus(200);
}

export async function deleteRepository( req, res ) {
  const { uuid }= req.params;
  
  const success= await ApiBridge.the().removeRepo( uuid );
  if( !success ) {
    return res.status( 404 ).end(`Unknown repository UUID '${uuid}'`);
  }

  res.sendStatus(200);
}
