import { GraphQLClient } from 'graphql-request';
import { logger } from '../../common/index.js';

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

    /** @type {string?} */
    this.actualBaseURLValue= null;

    /** @type {string} */
    this.plainProjectId= null;

    /** @type {string} */
    this.encodedProjectId= null;

    if( this.repository.baseURL && this.repository.projectId ) {
      this.actualBaseURLValue = this.repository.baseURL;
      this.plainProjectId = this.repository.projectId;
      this.encodedProjectId = encodeURIComponent(this.repository.projectId);
    }

    /** @type {GraphQLClient} */
    this.graphqlClient = null;

    if( this.actualBaseURLValue ) {
      this._connectGraphQL();
    }
  }

  /** @returns {string} */
  get baseURL() {
    if( !this.actualBaseURLValue ) {
      throw new Error(`Repository API was not initialized yet. (url ${this.repository.url})`);
    }

    return this.actualBaseURLValue;
  }

  /**
   * Initializes the API for a new repository. Needs to be called once before any
   * other API queries are performed.
   */
  async init() {
    // Figure out what part of the repository URL are the base url and project id
    const {baseURL, projectId}= await this._bruteForceGitlabURLStructure( this.repository.url );
    this.actualBaseURLValue= baseURL;
    this.plainProjectId= projectId;
    this.encodedProjectId= encodeURIComponent(projectId);

    logger.info(`Determined repository URL structure (base: ${baseURL}, projectId: ${projectId})`);

    // Also update the repo object so the data gets persisted
    this.repository.baseURL= baseURL;
    this.repository.projectId= projectId;

    this._connectGraphQL();
  }

  _connectGraphQL() {
    this.graphqlClient = new GraphQLClient(
      `${this.baseURL}/api/graphql`,
      this._gitlabApiAuthHeader()
    );
  }

  /**
   * Split the GitLabURL into its baseURL (Origin +  base path) and the project resource path.
   * Because the base path can be a route on a proxy when GitLab is served on a relative URL,
   * and because the project can be nested in (sub-)groups, we do not know where to split the URL.
   * Therefore we brute-force all possible splits until we get a response from the API.
   * @param {string|URL} url 
   */
  async _bruteForceGitlabURLStructure(url) {
    const urlObj = new URL(url);

    const pathParts = urlObj.pathname.split('/').filter(part => part !== '');

    if (pathParts.length < 1) {
      throw new Error(`Invalid GitLab repository URL: Doesn't contain a project name (url ${url})`);
    }

    // Start with just the origin (protocol + domain)
    let baseURL= urlObj.origin;

    for( let i= 0; i< pathParts.length; i++ ) {
      // Try to reach the api on the current base URL
      try {
        const controller= new AbortController();
        const resp= await fetch(`${baseURL}/api/v4/version`, {signal: controller.signal});

        // We expect a JSON response from the API with either a version field or a message
        // that we are lacking authentication
        if( (resp.ok || resp.status === 401) && resp.headers.get('content-type') === 'application/json') {
          const body= await resp.json();
          if( body.message || body.version ) {
            const projectId= pathParts.slice(i).join('/');
            return { baseURL, projectId };
          }
        } else {
          controller.abort();
        }
      } catch( e ) {}

      // Append the next part of the path and try again
      baseURL= `${baseURL}/${pathParts[i]}`;
    }

    throw new Error(`Invalid GitLab repository URL: No subpath yielded a reachable base path (url ${url})`);
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
      return `${this.baseURL}/api/v4${formattedPath}`;
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
   * @returns The project id that is found in the repository URL. When
   * no name for the project is available one can fallback to this less
   * readable alternative.
   */
  get projectIdFromUrl() {
    return this.plainProjectId;
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
        logger.error(
          `Could not access token information for repo '${this.baseURL}' (status ${personalTokenResp.status})`
        );
        return {
          status: 400,
          message: `Invalid token: Cannot access token information for repo '${this.baseURL}'`
        };
      }

      if( personalTokenResp.headers.get('content-type') !== 'application/json' ) {
        logger.error(
          `Could not access token information for repo '${this.baseURL}' (Received non-JSON data)`
        );
        return {
          status: 400,
          message: `Invalid token: Accessing token information for repo '${this.baseURL}' returned wrong data. (Maybe we were returned a login page)`
        };
      }

      const { scopes, user_id } = await personalTokenResp.json();

      // Check that we at least can read the API and repository
      const canReadAPI = scopes.includes('api') || scopes.includes('read_api');
      const canReadGit = scopes.includes('read_repository');
      if (!canReadAPI || !canReadGit) {
        logger.warning(
          `Token doesn't have the required scopes for repo '${this.baseURL}' (scopes ${scopes})`
        );
        return {
          status: 400,
          message: `Invalid token: Token doesn't have the required scopes for repo '${this.baseURL}'`
        };
      }

      // Check that the access token is associated with the project
      // We look at all members of the project including indirect inherited ones, hence the '/all'
      // We only care whether the user/bot exists on the project, hence we only check the status
      // code instead of reading the JSON response.
      const membersPath = `${this.baseURL}/api/v4/projects/${this.encodedProjectId}/members/all/${user_id}`;
      const membersResp = await fetch(membersPath, this._gitlabApiAuthHeader());
      if (!membersResp.ok) {
        if (membersResp.status === 404) {
          return {
            status: 400,
            message: `Invalid token: Token is not a member of repo '${this.projectId}'`
          };
        }

        logger.warning(
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
        logger.error(`Could not connect to repository URL: Received type error from fetch: %s`, e);
        return { status: 400, message: `Invalid URL: Did not get a response` };
      }

      throw e;
    }
  }
}
