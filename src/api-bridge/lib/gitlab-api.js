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

        const { baseURL, resourcePath } = this._parseGitlabURL(this.repository.url)
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
        if(!fetchURL.includes("/api/v4")) {
            // No full URL given, fetchURL needs to be constructed
            const constructedResourceURL = resourcePath.replace(':id', this.projectId);
            fetchURL = `${this.baseURL}/api/v4${constructedResourceURL}`
        }

        const resp = await fetch(fetchURL, {
            headers: {
                'Authorization': `Bearer ${this.repository.authToken}`
            }
        });

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

        return {data: results};
    }

    async checkAuthToken() {
        //TODO: Add support for Project access tokens

        // const projectTokenPath = this.baseURL + "/api/v4/projects/:id/access_tokens".replace(':id', this.projectId);
        const personalTokenPath = this.baseURL + "/api/v4/personal_access_tokens/self";

        // let resp = await fetch(projectTokenPath, {
        //     headers: {
        //         'Authorization': `Bearer ${this.repository.authToken}`
        //     }
        // });
        // 400 status code means the token is invalid


        const resp = await fetch(personalTokenPath, {
            headers: {
                'Authorization': `Bearer ${this.repository.authToken}`
            }
        });
        if (!resp.ok) {
            return {status: 400, message: 'Invalid token: Can\'t access token information!'};
        }

        const authTokenData = await resp.json();
        if (!(authTokenData.scopes.includes('api') || authTokenData.scopes.includes('read_api'))) {
            return {status: 400, message: 'Invalid token: Token doesn\'t have the required scope!'};
        }
        return {status: 200};
    }
}
