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

    const { baseURL, resourcePath } = this._parseGitlabURL(this.repository.url);
    this.baseURL = baseURL;
    // Remove any leading or trailing '/' and URL encode the path
    this.projectId = encodeURIComponent(resourcePath.replace(/^\/+|\/+$/g, ''));
  }

  // Split the GitLabURL into its baseURL (Origin +  base path) and the resource path
  _parseGitlabURL(url) {
    const urlObj = new URL(url);

    const pathParts = urlObj.pathname.split('/').filter(part => part !== '');

    if (pathParts.length < 2) {
      throw new Error(`Invalid URL: Doesn't contain group/project name: ${url}`);
    }

    // Create the baseURL by joining all parts but the last 2 (containing group & project name)
    const basePath = pathParts.slice(0, -2).join('/');
    const baseURL = `${urlObj.origin}/${basePath}`;

    const resourcePath = `/${pathParts.slice(-2).join('/')}`;

    return { baseURL, resourcePath };
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

  _getNextPageURL(headers) {
    const linkHeader = headers.get('Link');
    if (!linkHeader) {
      return null; // No pagination links
    }

    // Extract the 'link' URLs (first, next, last)
    const links = linkHeader.split(',').map(link => {
      const [url, rel] = link.split(';').map(item => item.trim());
      return {
        url: url.replace(/<(.*)>/, '$1'),
        rel: rel.replace(/rel="(.*)"/, '$1')
      };
    });

    const nextLink = links.find(link => link.rel === 'next');
    return nextLink ? nextLink.url : null;
  }

  // Fetch a single page of data from the given resourcePath
  async fetch(resourcePath) {
    let fetchURL = resourcePath;
    if (!fetchURL.includes('/api/v4')) {
      // No full URL given, fetchURL needs to be constructed
      const constructedResourceURL = resourcePath.replace(':id', this.projectId);
      fetchURL = `${this.baseURL}/api/v4${constructedResourceURL}`;
    }

    const resp = await fetch(fetchURL, this._gitlabApiAuthHeader());
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Could not fetch project (status ${resp.status}): ${text}`);
    }

    const data = await resp.json();
    return { data, headers: resp.headers };
  }

  // Fetch all page, by handling pagination, from the given resourcePath
  async fetchAll(resourcePath) {
    let results = [];
    let nextResourcePath = resourcePath;

    do {
      const { data, headers } = await this.fetch(nextResourcePath);
      results = results.concat(data);

      nextResourcePath = this._getNextPageURL(headers);
    } while (nextResourcePath);

    return { data: results };
  }

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
      const membersPath = `${this.baseURL}/api/v4/projects/${this.projectId}/members/${user_id}`;
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
