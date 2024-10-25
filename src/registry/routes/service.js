
import Joi from 'joi';
import { Registry } from '../lib/registry.js';

const serviceInstanceValidator= Joi.object({
  hostname: Joi.string().required(),
  healthCheck: Joi.string().required(),
  data: Joi.object().default({})
}).unknown(false).required();


export function postService( req, res ) {
  const {value, error}= serviceInstanceValidator.validate( req.body );
  if( error ) {
    console.log('Post Service: Validation error', error);
    res.status( 422 ).send( error.details || 'Validation error' );
    return;
  }

  const {name}= req.params;
  const {hostname, healthCheck, data}= value;
  const id= Registry.the().ensureService( name ).createInstance( hostname, healthCheck, data );
  if( !id ) {
    res.status( 409 ).send( `Duplicate hostname '${hostname}' for service '${name}'` );
    return;
  }

  res.json({ id });
}

export function deleteService( req, res ) {
  const {name, id}= req.params;
  const service= Registry.the().service( name );
  if( !service ) {
    res.status(404).end(`Unknown service '${name}'\n`);
    return;
  }

  const didRemove= service.removeInstance( id );
  if( !didRemove ) {
    res.status(404).end(`Unknown service instance '${name}/${id}'\n`);
    return;
  }

  res.sendStatus(200);
}

export function putService( req, res ) {
  const {name, id}= req.params;
  const service= Registry.the().service( name );
  if( !service ) {
    res.status(404).end(`Unknown service '${name}'\n`);
    return;
  }

  const {value, error}= serviceInstanceValidator.validate( req.body );
  if( error ) {
    console.log('Put Service: Validation error', error);
    res.status( 422 ).send( error.details || 'Validation error' );
    return;
  }

  const {hostname, healthCheck, data}= value;
  const didUpdate= service.updateInstance( id, hostname, healthCheck, data );
  if( !didUpdate ) {
    res.status(404).end(`Unknown service instance '${name}/${id}'\n`);
    return;
  }

  res.sendStatus(200);
}

export function getService( req, res ) {
  const {name}= req.params;
  const service= Registry.the().service( name );
  if( !service ) {
    res.status(404).end(`Unknown service '${name}'\n`);
    return;
  }

  res.json( service.serviceData() );
}
