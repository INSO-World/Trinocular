import { apiAuthHeader } from '../../common/index.js';

/**
 * Get data for a given datasource from a given repository from the api bridge service
 * @param {string} uuid
 * @param {string} datasource
 * @returns {Promise<{error: string}|{data: [any]}>} error message or datasource data
 */
export async function getDatasourceForRepositoryFromApiBridge(datasource, uuid) {
  try {
    const url = `http://${process.env.API_BRIDGE_NAME}/bridge/${uuid}/${datasource}`;
    const headers = apiAuthHeader({
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    const resp = await fetch(url, headers);

    if (!resp.ok) {
      const message = await resp.text();
      return {
        error: `Could not get datasource ${datasource} for repository ${uuid} from API service: ${message}`
      };
    }

    return { data: await resp.json() };
  } catch (e) {
    return { error: `Could not connect to API service` };
  }
}

/**
 * Get data repository with uuid from api bridge service
 * @returns {Promise<{error: string}|{data: [any]}>} error message or repository data
 */
export async function getRepositoryForUuid(uuid) {
  try {
    const url = `http://${process.env.API_BRIDGE_NAME}/bridge/${uuid}/details`;
    const headers = apiAuthHeader({
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    const resp = await fetch(url, headers);

    if (!resp.ok) {
      const message = await resp.text();
      return {
        error: `Could not get datasource details for repository ${uuid} from API service: ${message}`
      };
    }
    return { data: await resp.json() };
  } catch (e) {
    return { error: `Could not connect to API service` };
  }
}
