
import Joi from 'joi';
import { apiAuthHeader } from '../../common/index.js';

/** @type {Set<string>} */
export const visualizationHostnames= new Set();

const visualizationHostnameValidator= Joi.object().pattern(Joi.string(), Joi.object({
  hostname: Joi.string().required(),
}).required().unknown(true)).required();

export async function updateVisualizationsFromRegistry() {
  try {
    // Talk to registry
    const resp= await fetch(`http://${process.env.REGISTRY_NAME}/service/${process.env.VISUALIZATION_GROUP_NAME}`, apiAuthHeader());
    if( !resp.ok ) {
      throw new Error(`Did not return ok (status ${resp.status})`);
    }

    // Load JSON
    const json= await resp.json();
    const {value, error}= visualizationHostnameValidator.validate( json );
    if( error ) {
      throw new Error('Received invalid service list from registry: '+ error, {cause: error});
    }
    
    // Update data
    visualizationHostnames.clear();
    for( const id in value ) {
      visualizationHostnames.add( value[id].hostname );
    }

    console.log(`Updated visualization hostnames (${visualizationHostnames.size} found)`);

  } catch( e ) {
    console.error(`Could not update visualization services from registry:`, e);
  }
}
