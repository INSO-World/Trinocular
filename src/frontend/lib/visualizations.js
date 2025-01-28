import Joi from 'joi';
import { apiAuthHeader } from '../../common/index.js';

/** @type Map<string, Visualization> */
export const visualizations = new Map();

/** @type Set<string> */
export const visualizationHostnames = new Set();

class Visualization {
  /**
   * @param {string} id
   * @param {string} name
   * @param {string} hostname
   * @param {string} displayName
   * @param {string} framePath
   */
  constructor(id, name, hostname, displayName, framePath) {
    this.registryId = id;
    this.name = name;
    this.hostname = hostname;
    this.displayName = displayName;
    this.framePath = framePath;
    this.frameUrl = `http://${process.env.HOST_NAME}/vis/${hostname}/${framePath}`;
  }
}

const visualizationServicesValidator = Joi.object()
  .pattern(
    Joi.string(),
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
      .required()
      .unknown(true)
  )
  .required();

export async function updateVisualizationsFromRegistry() {
  try {
    // Talk to registry
    const resp = await fetch(
      `http://${process.env.REGISTRY_NAME}/service/${process.env.VISUALIZATION_GROUP_NAME}`,
      apiAuthHeader()
    );
    if (!resp.ok) {
      throw new Error(`Did not return ok (status ${resp.status})`);
    }

    // Load JSON
    const json = await resp.json();
    const { value, error } = visualizationServicesValidator.validate(json);
    if (error) {
      throw new Error('Received invalid service list from registry: ' + error, {
        cause: error
      });
    }

    // Clear old data
    visualizations.clear();
    visualizationHostnames.clear();

    // Populate the map
    for (const id in value) {
      // Skip visualizations that provided bad data
      try {
        const {
          hostname,
          data: { visualizations: visArray }
        } = value[id];
        visualizationHostnames.add(hostname);

        for (const vis of visArray) {
          const { name, displayName, framePath } = vis;
          const visualization = new Visualization(id, name, hostname, displayName, framePath);
          visualizations.set(name, visualization);
        }
      } catch (e) {
        console.error(`Visualization with registry id '${id}' could not be updated:`, e);
      }
    }

    console.log(`Updated visualizations (${visualizations.size} found)`);
    // console.log( visualizations );
  } catch (e) {
    console.error(`Could not update visualization services from registry:`, e);
  }
}
