import Joi from 'joi';
import { apiAuthHeader, getServiceStatus, logger } from '../../common/index.js';

/** @type {Set<string>} */
export const visualizationHostnames = new Set();

const visualizationHostnameValidator = Joi.array()
  .items(
    Joi.object({
      hostname: Joi.string().required()
    })
      .unknown(true) // The object is not 'required' to allow an empty array
  )
  .required();

export async function updateVisualizationsFromRegistry() {
  try {
    const json= await getServiceStatus(process.env.VISUALIZATION_GROUP_NAME);
    const { value, error } = visualizationHostnameValidator.validate(json);
    if (error) {
      throw new Error('Received invalid service list from registry: ' + error, {
        cause: error
      });
    }

    // Update data
    visualizationHostnames.clear();
    value.forEach( serviceInstance => visualizationHostnames.add(serviceInstance.hostname) );

    logger.info(`Updated visualization hostnames (${visualizationHostnames.size} found)`);
  } catch (e) {
    logger.error(`Could not update visualization services from registry: %s`, e);
  }
}
