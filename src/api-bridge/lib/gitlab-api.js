/** @typedef {import('./repository.js').Repository} Repository */

export class GitLabAPI {

    /**
     * @param {Repository} repo
     */
    constructor(repo) {
        this.repository = repo;

        const { baseURL, resourcePath } = this.parseGitlabURL(this.repository.url)
        this.baseURL = baseURL;
        // Remove any leading or trailing '/' and URL encode the path
        this.projectId = encodeURIComponent(resourcePath.replace(/^\/+|\/+$/g, ''));
    }

    parseGitlabURL(url) {
        const urlObj = new URL(url);

        const pathParts = urlObj.pathname.split('/').filter(part => part !== '');

        if (pathParts.length < 2) {
            throw new Error('The URL does not contain enough path segments.');
        }

        // Create the baseURL by joining all parts but the last 2
        const basePath = pathParts.slice(0, -2).join('/');
        const baseURL = `${urlObj.origin}/${basePath}`;

        const resourcePath = `/${pathParts.slice(-2).join('/')}`;

        return { baseURL, resourcePath };
    }

    // Fetch a single page
    async fetch(resourcePath) {
        const constructedResourceURL = resourcePath.replace(':id', this.projectId);

        const resp = await fetch(`${this.baseURL}/api/v4${constructedResourceURL}`, {
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

    // Fetch all pages, handles pagination
    async fetchAll(resourcePath) {
        let results = [];
        let nextResourcePath = resourcePath;

        do {
            const { data, headers } = await this.fetch(nextResourcePath);
            results = results.concat(data);

            const nextPageURL = this.getNextPageURL(headers);

            nextResourcePath = nextPageURL ? nextPageURL.replace(/.*\/api\/v\d+/, ''): null; // Remove the baseURL
        } while (nextResourcePath);

        return results;
    }

    getNextPageURL(headers) {
        const linkHeader = headers.get('Link');
        if (!linkHeader) {
            return null; // No pagination links
        }

        // Extract the link URLs (first, next, last)
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
}
