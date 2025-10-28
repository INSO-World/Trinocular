import Joi from 'joi';
import { apiAuthHeader, flagIsSet, getServiceStatus, logger } from '../../common/index.js';

/** @type Map<string, Visualization> */
export const visualizations = new Map();

/** @type Set<string> */
export const visualizationHostnames = new Set();

class Visualization {
  /**
   * @param {string} name
   * @param {string} hostname
   * @param {string} displayName
   * @param {string} framePath
   */
  constructor(name, hostname, displayName, framePath) {
    this.name = name;
    this.hostname = hostname;
    this.displayName = displayName;
    this.framePath = framePath;

    const protocol= flagIsSet('PUBLIC_HTTPS') ? 'https' : 'http';
    this.frameUrl = `${protocol}://${process.env.HOST_NAME}/vis/${hostname}/${framePath}`;
  }
}

const visualizationServicesValidator = Joi.array().items(
  Joi.object({
    hostname: Joi.string().required(),
    data: Joi.object({
      visualizations: Joi.array()
        .items(
          Joi.object({
            name: Joi.string().required(),
            displayName: Joi.string().required(),
            framePath: Joi.string().required()
          })
        )
        .required()
    })
      .required()
      .unknown(true)
  })
    .unknown(true) // The object is not 'required' to allow an empty array
)
  .required();

export async function updateVisualizationsFromRegistry() {
  try {
    // Talk to registry
    const json= await getServiceStatus(process.env.VISUALIZATION_GROUP_NAME)

    const { value: visServiceInstances, error } = visualizationServicesValidator.validate(json);
    if (error) {
      throw new Error('Received invalid service list from registry: ' + error, {
        cause: error
      });
    }

    // Clear old data
    visualizations.clear();
    visualizationHostnames.clear();

    // Populate the map
    for (const visServiceInstance of visServiceInstances) {
      // Skip visualizations that provided bad data
      try {
        const {
          hostname,
          data: { visualizations: visArray }
        } = visServiceInstance;
        visualizationHostnames.add(hostname);

        for (const vis of visArray) {
          const { name, displayName, framePath } = vis;
          const visualization = new Visualization(name, hostname, displayName, framePath);
          visualizations.set(name, visualization);
        }
      } catch (e) {
        logger.error(`Visualization with hostname '${visServiceInstance.hostname}' could not be updated: %s`, e);
      }
    }

    logger.info(`Updated visualizations (${visualizations.size} found)`);
  } catch (e) {
    logger.error(`Could not update visualization services from registry: %s`, e);
  }
}
