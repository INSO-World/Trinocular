import { GraphQLClient } from 'graphql-request';

/** @typedef {import('./repository.js').Repository} Repository */

/*
 *  GitLabAPI allows for fetching repository data from the GitLab API, using the repository GitLab URL.
 */
export class GitLabAPI {
  /**
   * @param {Repository} repo
   */
  constructor(repo) {
    this.repository = repo;

    const { baseURL, projectId } = this._parseGitlabURL(this.repository.url);
    this.baseURL = baseURL;
    this.plainProjectId = projectId;
    this.encodedProjectId = encodeURIComponent(projectId);

    this.graphqlClient = new GraphQLClient(
      `${this.baseURL}/api/graphql`,
      this._gitlabApiAuthHeader()
    );
  }

  // Split the GitLabURL into its baseURL (Origin +  base path) and the resource path
  _parseGitlabURL(url) {
    const urlObj = new URL(url);

    const pathParts = urlObj.pathname.split('/').filter(part => part !== '');

    // FIXME: We need to catch this error in the route handlers
    if (pathParts.length < 2) {
      throw new Error(`Invalid URL: Doesn't contain group/project name: ${url}`);
    }

    // Create the baseURL by joining all parts but the last 2 (containing group & project name)
    const basePath = pathParts.slice(0, -2).join('/');
    const baseURL = `${urlObj.origin}/${basePath}`;

    // Create the projectId by combining the group/user name and the project name
    const projectId = pathParts.slice(-2).join('/');

    return { baseURL, projectId };
  }

  _gitlabApiAuthHeader(options = {}) {
    // Make sure that the options object has a headers key
    if (!options.headers) {
      options.headers = {};
    }

    // Add the bearer token to the authorization header
    options.headers['Authorization'] = `Bearer ${this.repository.authToken}`;

    return options;
  }

  _parseLinkHeader(headers) {
    const linkHeader = headers.get('Link');
    if (!linkHeader) {
      return {}; // No pagination links
    }

    // Preset common link names for efficiency
    const links = {
      prev: null,
      next: null,
      first: null,
      last: null
    };

    // Parse as <...url...>; rel="kind", ...
    const parser = /<(?<url>.+?)>; rel="(?<rel>\w+)",?/g;
    for (const match of linkHeader.matchAll(parser)) {
      // Add each match to the object of links
      if (match && match.groups.url && match.groups.rel) {
        const { rel, url } = match.groups;
        links[rel] = url;
      }
    }

    return links;
  }

  _getNextPageURL(headers) {
    const links = this._parseLinkHeader(headers);
    return links.next;
  }

  /**
   * Does nothing when a full URL is provided already, else the provided path gets
   * converted to a Rest API URL. The base URL and API prefix are added and colon-constants
   * are inserted.
   * @param {string} url Complete URL string or REST resource path
   * @returns {string}
   */
  _prepareRestUrl(url) {
    if (!url.startsWith('https://') && !url.startsWith('http://')) {
      // No full URL given (just the path), fetchURL needs to be constructed
      const formattedPath = url.replaceAll(':id', this.encodedProjectId);
      return `${this.baseURL}api/v4${formattedPath}`;
    }

    // Just return the URL unaltered
    return url;
  }

  async _restFetch(fetchURL) {
    try {
      const resp = await fetch(fetchURL, this._gitlabApiAuthHeader());
      if (!resp.ok) {
        const error = await resp.text();
        return { error, status: resp.status };
      }

      const data = await resp.json();
      return { data, status: resp.status, headers: resp.headers };
    } catch (e) {
      return {
        error: `Could not connect to Rest API: ${e}`,
        status: -1
      };
    }
  }

  /**
   * Fetch a single page of data from the given resource path.
   * Throws in case of error
   * @param {string} resourcePath
   * @returns {Promise<{data: any, status: number, headers: Headers}>}
   */
  async fetch(resourcePath) {
    const fetchURL = this._prepareRestUrl(resourcePath);
    const result = await this._restFetch(fetchURL);
    if (result.error) {
      throw new Error(
        `Could not fetch from Rest API (status ${result.status}, url ${fetchURL}): ${result.error}`
      );
    }

    return result;
  }

  /**
   * Fetch all pages of data from the given resource path by repeatedly following
   * the pagination next-links and collecting all responses.
   * @param {string} resourcePath
   * @returns {Promis<{data:any[]}>}
   */
  async fetchAll(resourcePath) {
    let results = [];
    let fetchURL = this._prepareRestUrl(resourcePath);

    do {
      const { data, headers, status, error } = await this._restFetch(fetchURL);
      if (error) {
        throw new Error(
          `Could not fetch from Rest API with pagination (status ${status}, url ${fetchURL}): ${error}`
        );
      }

      // Append results
      results = results.concat(data);

      // Go to the next page
      fetchURL = this._getNextPageURL(headers);
    } while (fetchURL);

    return { data: results };
  }

  async query(document, variables = {}) {
    variables.projectId = this.plainProjectId;
    return this.graphqlClient.request(document, variables);
  }

  /**
   * Fetches all data from a GraphQL query with pagination by reading the
   * pageInfo object and rerunning the query with the returned cursor
   * repeatedly until no more pages are available. All nodes are collected
   * into an array.
   * @param {string} document
   * @param {function(any):{pageInfo:{hasNextPage: boolean, endCursor: string?}, nodes: any[]}} extractorFunction
   * @param {Object.<string,any>?} variables
   */
  async queryAll(document, extractorFunction, variables = {}) {
    variables.projectId = this.plainProjectId;
    variables.endCursor = null;

    let keepRunning = false;
    let results = [];

    do {
      const result = await this.graphqlClient.request(document, variables);
      const {
        nodes,
        pageInfo: { hasNextPage, endCursor }
      } = extractorFunction(result);

      // Append results
      results = results.concat(nodes);

      // Go to next page
      keepRunning = hasNextPage;
      variables.endCursor = endCursor;
    } while (keepRunning);

    return results;
  }

  async loadPublicName() {
    try {
      const {
        data: { name }
      } = await this.fetch('/projects/:id');
      return name;
    } catch (e) {
      throw new Error(`Could not access project information for repo '${this.baseURL}'`, {
        cause: e
      });
    }
  }

  /**
   * Return id and userName of the gitlab user that belongs to the authToken
   * and boolean isBot if the user is a bot from gitlab
   */
  async getAuthTokenAssociatedUser() {
    try {
      const {
        data: { id, username: userName, bot: isBot }
      } = await this.fetch('/user');
      return { id, userName, isBot };
    } catch (e) {
      throw new Error(`Could not access user information for repo '${this.baseURL}'`, { cause: e });
    }
  }

  /**
   * Tests whether the access token works for the repository and has enough permissions by
   * performing API calls.
   * @returns {Promise<{status: number, message: string|undefined}>}
   */
  async checkAuthToken() {
    try {
      // Get the token scopes
      // Note: The personal access token endpoint also works for project access tokens
      const personalTokenPath = `${this.baseURL}/api/v4/personal_access_tokens/self`;
      const personalTokenResp = await fetch(personalTokenPath, this._gitlabApiAuthHeader());
      if (!personalTokenResp.ok) {
        console.error(
          `Could not access token information for repo '${this.baseURL}' (status ${personalTokenResp.status})`
        );
        return {
          status: 400,
          message: `Invalid token: Cannot access token information for repo '${this.baseURL}'`
        };
      }

      const { scopes, user_id } = await personalTokenResp.json();

      // Check that we at least can read the API and repository
      const canReadAPI = scopes.includes('api') || scopes.includes('read_api');
      const canReadGit = scopes.includes('read_repository');
      if (!canReadAPI || !canReadGit) {
        console.error(
          `Token doesn't have the required scopes for repo '${this.baseURL}' (scopes ${scopes})`
        );
        return {
          status: 400,
          message: `Invalid token: Token doesn't have the required scopes for repo '${this.baseURL}'`
        };
      }

      // Check that the access token is associated with the project
      // We only care whether the user/bot exists on the project, hence we only check the status
      // code instead of reading the JSON response.
      const membersPath = `${this.baseURL}/api/v4/projects/${this.encodedProjectId}/members/${user_id}`;
      const membersResp = await fetch(membersPath, this._gitlabApiAuthHeader());
      if (!membersResp.ok) {
        if (membersResp.status === 404) {
          return {
            status: 400,
            message: `Invalid token: Token is not a member of repo '${this.baseURL}'`
          };
        }

        console.error(
          `Could not access member information for repo '${this.baseURL}' (status ${membersResp.status})`
        );
        return {
          status: 400,
          message: `Invalid token: Cannot access members information for repo '${this.baseURL}'`
        };
      }

      return { status: 200 };
    } catch (e) {
      // Not being able to connect to GitLab at all is also considered to be a failure
      // of the auth-token-check
      if (e instanceof TypeError) {
        console.error(`Could not connect to repository URL: Received type error from fetch:`, e);
        return { status: 400, message: `Invalid URL: Did not get a response` };
      }

      throw e;
    }
  }
}
