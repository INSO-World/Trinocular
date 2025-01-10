import { expect } from 'chai';
import * as chai from 'chai';
import sinonChai from 'sinon-chai';
import sinon from 'sinon';
import esmock from 'esmock';
import { GraphQLClient } from 'graphql-request';

chai.use(sinonChai);

describe('GitLabAPI', () => {
  let GitLabAPIMock;
  let RepositoryMock;
  let repositoryInstance;

  beforeEach(async () => {
    RepositoryMock = class Repository {
      constructor(url) {
        this.url = url;
      }
    };

    GitLabAPIMock = await esmock('../lib/gitlab-api.js', {
      '../lib/repository.js': { Repository: RepositoryMock },
      'graphql-request': { GraphQLClient }
    }).then(mockedModule => mockedModule.GitLabAPI);
  });

  describe('constructor', () => {
    it('should correctly initialize with a valid repository', () => {
      const mockUrl = 'https://example.com/group/project';
      repositoryInstance = new RepositoryMock(mockUrl);

      const gitLabAPI = new GitLabAPIMock(repositoryInstance);

      expect(gitLabAPI.repository).to.equal(repositoryInstance);
      expect(gitLabAPI.baseURL).to.equal('https://example.com');
      expect(gitLabAPI.plainProjectId).to.equal('group/project');
      expect(gitLabAPI.encodedProjectId).to.equal('group%2Fproject');
      expect(gitLabAPI.graphqlClient).to.be.an.instanceOf(GraphQLClient);
    });

    // it('should throw an error for invalid URL', () => {
    //   const invalidUrl = 'https://gitlab.com/';
    //
    //   repositoryInstance = new RepositoryMock(invalidUrl);
    //
    //   expect(() => new GitLabAPI(repositoryInstance)).to.throw(
    //     `Invalid URL: Doesn't contain group/project name: ${invalidUrl}`
    //   );
    // });
  });

  describe('_parseGitlabURL', () => {
    it('should correctly parse a valid GitLab URL', () => {
      const gitLabAPI = new GitLabAPIMock(new RepositoryMock('https://example.com/group/project'));
      const result = gitLabAPI._parseGitlabURL('https://example.com/group/project');

      expect(result).to.deep.equal({
        baseURL: 'https://example.com',
        projectId: 'group/project'
      });
    });

    it('should throw an error for a URL missing project ID', () => {
      const gitLabAPI = new GitLabAPIMock(new RepositoryMock('https://example.com/group/project'));

      expect(() => gitLabAPI._parseGitlabURL('https://example.com/group')).to.throw(
        "Invalid URL: Doesn't contain group/project name: https://example.com/group"
      );
    });
  });

  describe('_gitlabApiAuthHeader', () => {
    it('should add an Authorization header when none is provided', () => {
      const repositoryMock = new RepositoryMock('https://example.com/group/project');
      repositoryMock.authToken = 'mockToken';
      const gitLabAPI = new GitLabAPIMock(repositoryMock);

      const options = {};
      const result = gitLabAPI._gitlabApiAuthHeader(options);

      expect(result.headers).to.have.property('Authorization', 'Bearer mockToken');
    });

    it('should not overwrite existing headers but should add Authorization', () => {
      const repositoryMock = new RepositoryMock('https://example.com/group/project');
      repositoryMock.authToken = 'mockToken';
      const gitLabAPI = new GitLabAPIMock(repositoryMock);

      const options = { headers: { 'Content-Type': 'application/json' } };
      const result = gitLabAPI._gitlabApiAuthHeader(options);

      expect(result.headers).to.include({
        'Content-Type': 'application/json',
        Authorization: 'Bearer mockToken'
      });
    });
  });

  describe('_parseLinkHeader', () => {
    it('should parse a valid Link header with all link types', () => {
      const repositoryMock = new RepositoryMock('https://example.com/group/project');
      const gitLabAPI = new GitLabAPIMock(repositoryMock);

      const mockHeaders = {
        get: sinon
          .stub()
          .withArgs('Link')
          .returns(
            '<https://example.com/group/project?page=2>; rel="next", ' +
              '<https://example.com/group/project?page=1>; rel="prev", ' +
              '<https://example.com/group/project?page=1>; rel="first", ' +
              '<https://example.com/group/project?page=5>; rel="last"'
          )
      };

      const result = gitLabAPI._parseLinkHeader(mockHeaders);

      expect(result).to.deep.equal({
        next: 'https://example.com/group/project?page=2',
        prev: 'https://example.com/group/project?page=1',
        first: 'https://example.com/group/project?page=1',
        last: 'https://example.com/group/project?page=5'
      });
    });

    it('should return an empty object if Link header is missing', () => {
      const repositoryMock = new RepositoryMock('https://gitlab.com/group/project');
      const gitLabAPI = new GitLabAPIMock(repositoryMock);

      const mockHeaders = {
        get: sinon.stub().withArgs('Link').returns(null)
      };

      const result = gitLabAPI._parseLinkHeader(mockHeaders);

      expect(result).to.deep.equal({});
    });

    it('should parse a Link header with only some link types', () => {
      const repositoryMock = new RepositoryMock('https://example.com/group/project');
      const gitLabAPI = new GitLabAPIMock(repositoryMock);

      const mockHeaders = {
        get: sinon
          .stub()
          .withArgs('Link')
          .returns(
            '<https://example.com/group/project?page=2>; rel="next", ' +
              '<https://example.com/group/project?page=5>; rel="last"'
          )
      };

      const result = gitLabAPI._parseLinkHeader(mockHeaders);

      expect(result).to.deep.equal({
        next: 'https://example.com/group/project?page=2',
        prev: null,
        first: null,
        last: 'https://example.com/group/project?page=5'
      });
    });
  });

  describe('_getNextPageURL', () => {
    it('should return the next page URL', () => {
      const repositoryMock = new RepositoryMock('https://example.com/group/project');
      const gitLabAPI = new GitLabAPIMock(repositoryMock);

      const mockHeaders = {};

      const parseLinkHeaderStub = sinon.stub(gitLabAPI, '_parseLinkHeader').returns({
        next: 'https://example.com/group/project?page=2',
        prev: 'https://example.com/group/project?page=1',
        first: null,
        last: null
      });

      const result = gitLabAPI._getNextPageURL(mockHeaders);

      expect(parseLinkHeaderStub).to.have.been.calledOnceWithExactly(mockHeaders);
      expect(result).to.equal('https://example.com/group/project?page=2');

      parseLinkHeaderStub.restore();
    });
  });

  describe('_prepareRestUrl', () => {
    let gitLabAPI;
    let repositoryMock;

    beforeEach(() => {
      repositoryMock = new RepositoryMock('https://example.com/group/project');
      gitLabAPI = new GitLabAPIMock(repositoryMock);
    });

    it('should return the full URL unaltered if already a complete URL', () => {
      const fullUrl = 'https://api.example.com/resource';
      const result = gitLabAPI._prepareRestUrl(fullUrl);

      expect(result).to.equal(fullUrl);
    });

    it('should replace the :id placeholder in the path with the encoded project ID', () => {
      const path = '/projects/:id/merge_requests';
      const expectedUrl = 'https://example.com/api/v4/projects/group%2Fproject/merge_requests';

      const result = gitLabAPI._prepareRestUrl(path);

      expect(result).to.equal(expectedUrl);
    });
  });

  describe('_restFetch', () => {
    let gitLabAPI;
    let fetchStub;

    beforeEach(() => {
      let repositoryMock = new RepositoryMock('https://example.com/group/project');
      gitLabAPI = new GitLabAPIMock(repositoryMock);

      fetchStub = sinon.stub(global, 'fetch');
    });

    afterEach(() => {
      fetchStub.restore();
    });

    it('should return data and status on a successful response', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: sinon.stub().resolves({ key: 'value' }),
        headers: new Headers({ 'Content-Type': 'application/json' })
      };

      fetchStub.resolves(mockResponse);

      const result = await gitLabAPI._restFetch('https://example.com/api/v4/resource');

      expect(fetchStub).to.have.been.calledOnceWithExactly(
        'https://example.com/api/v4/resource',
        sinon.match.object
      );

      expect(result).to.deep.equal({
        data: { key: 'value' },
        status: 200,
        headers: mockResponse.headers
      });
    });

    it('should return error and status on a failed response', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        text: sinon.stub().resolves('Not Found')
      };

      fetchStub.resolves(mockResponse);

      const result = await gitLabAPI._restFetch('https://example.com/api/v4/resource');

      expect(fetchStub).to.have.been.calledOnceWithExactly(
        'https://example.com/api/v4/resource',
        sinon.match.object
      );

      expect(result).to.deep.equal({
        error: 'Not Found',
        status: 404
      });
    });

    it('should return an error object if fetch throws an exception', async () => {
      fetchStub.rejects(new Error('Network Error'));

      const result = await gitLabAPI._restFetch('https://example.com/api/v4/resource');

      expect(fetchStub).to.have.been.calledOnceWithExactly(
        'https://example.com/api/v4/resource',
        sinon.match.object
      );

      expect(result).to.deep.equal({
        error: 'Could not connect to Rest API: Error: Network Error',
        status: -1
      });
    });
  });

  describe('fetch', () => {
    let gitLabAPI;
    let restFetchStub;

    beforeEach(() => {
      let repositoryMock = new RepositoryMock('https://example.com/group/project');
      gitLabAPI = new GitLabAPIMock(repositoryMock);

      restFetchStub = sinon.stub(gitLabAPI, '_restFetch');
    });

    afterEach(() => {
      restFetchStub.restore();
    });

    it('should return data, status, and headers on successful fetch', async () => {
      const mockResult = {
        data: { key: 'value' },
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/json' })
      };

      restFetchStub.resolves(mockResult);

      const resourcePath = '/projects/:id/issues';
      const result = await gitLabAPI.fetch(resourcePath);

      expect(restFetchStub).to.have.been.calledOnceWithExactly(
        'https://example.com/api/v4/projects/group%2Fproject/issues'
      );

      expect(result).to.deep.equal(mockResult);
    });

    it('should throw an error with descriptive message on fetch failure', async () => {
      const mockErrorResult = {
        error: 'Not Found',
        status: 404
      };

      restFetchStub.resolves(mockErrorResult);

      const resourcePath = '/projects/:id/issues';

      try {
        await gitLabAPI.fetch(resourcePath);
        // If no error is thrown, force the test to fail
        throw new Error('Test failed: expected fetch to throw an error');
      } catch (err) {
        expect(err).to.be.an.instanceOf(Error);
        expect(err.message).to.equal(
          'Could not fetch from Rest API (status 404, url https://example.com/api/v4/projects/group%2Fproject/issues): Not Found'
        );

        expect(restFetchStub).to.have.been.calledOnceWithExactly(
          'https://example.com/api/v4/projects/group%2Fproject/issues'
        );
      }
    });
  });

  describe('fetchAll', () => {
    let gitLabAPI;
    let repositoryMock;
    let restFetchStub;
    let getNextPageURLStub;

    beforeEach(() => {
      repositoryMock = new RepositoryMock('https://example.com/group/project');
      gitLabAPI = new GitLabAPIMock(repositoryMock);

      restFetchStub = sinon.stub(gitLabAPI, '_restFetch');
      getNextPageURLStub = sinon.stub(gitLabAPI, '_getNextPageURL');
    });

    afterEach(() => {
      restFetchStub.restore();
      getNextPageURLStub.restore();
    });

    it('should fetch all pages of data successfully', async () => {
      const page1Data = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' }
      ];
      const page2Data = [{ id: 3, name: 'Item 3' }];
      const headersPage1 = new Headers({
        Link: '<https://example.com/api/v4/resource?page=2>; rel="next"'
      });
      const headersPage2 = new Headers({}); // No next link on last page

      restFetchStub.onCall(0).resolves({ data: page1Data, headers: headersPage1, status: 200 });
      restFetchStub.onCall(1).resolves({ data: page2Data, headers: headersPage2, status: 200 });

      getNextPageURLStub.onCall(0).returns('https://example.com/api/v4/resource?page=2');
      getNextPageURLStub.onCall(1).returns(null); // No next page

      const resourcePath = '/resource';
      const result = await gitLabAPI.fetchAll(resourcePath);

      expect(restFetchStub).to.have.been.calledTwice;
      expect(getNextPageURLStub).to.have.been.calledTwice;

      expect(restFetchStub.firstCall).to.have.been.calledWithExactly(
        'https://example.com/api/v4/resource'
      );
      expect(restFetchStub.secondCall).to.have.been.calledWithExactly(
        'https://example.com/api/v4/resource?page=2'
      );

      expect(result).to.deep.equal({
        data: [...page1Data, ...page2Data]
      });
    });

    it('should fetch a single page of data without pagination', async () => {
      const page1Data = [{ id: 1, name: 'Single Item' }];
      const headersPage1 = new Headers({}); // No pagination links

      restFetchStub.resolves({ data: page1Data, headers: headersPage1, status: 200 });
      getNextPageURLStub.returns(null); // No next page

      const resourcePath = '/resource';
      const result = await gitLabAPI.fetchAll(resourcePath);

      expect(restFetchStub).to.have.been.calledOnceWithExactly(
        'https://example.com/api/v4/resource'
      );
      expect(getNextPageURLStub).to.have.been.calledOnceWithExactly(headersPage1);

      expect(result).to.deep.equal({
        data: page1Data
      });
    });

    it('should throw an error if a fetch fails during pagination', async () => {
      const page1Data = [{ id: 1, name: 'Item 1' }];
      const headersPage1 = new Headers({
        Link: '<https://example.com/api/v4/resource?page=2>; rel="next"'
      });

      restFetchStub.onCall(0).resolves({ data: page1Data, headers: headersPage1, status: 200 });
      restFetchStub.onCall(1).resolves({
        error: 'Not Found',
        status: 404,
        headers: new Headers()
      });

      getNextPageURLStub.onCall(0).returns('https://example.com/api/v4/resource?page=2');

      const resourcePath = '/resource';

      try {
        await gitLabAPI.fetchAll(resourcePath);
        throw new Error('Test failed: expected fetchAll to throw an error');
      } catch (err) {
        expect(err).to.be.an.instanceOf(Error);
        expect(err.message).to.equal(
          'Could not fetch from Rest API with pagination (status 404, url https://example.com/api/v4/resource?page=2): Not Found'
        );

        expect(restFetchStub).to.have.been.calledTwice;
        expect(getNextPageURLStub).to.have.been.calledOnce;
      }
    });
  });

  describe('query', () => {
    let gitLabAPI;
    let repositoryMock;
    let requestStub;

    beforeEach(() => {
      repositoryMock = new RepositoryMock('https://example.com/group/project');
      gitLabAPI = new GitLabAPIMock(repositoryMock);

      // Stub GraphQLClient's request method
      requestStub = sinon.stub(gitLabAPI.graphqlClient, 'request');
    });

    afterEach(() => {
      requestStub.restore();
    });

    it('should send a query with the correct projectId and variables', async () => {
      const document = `query TestQuery { field }`;
      const variables = { key: 'value' };

      requestStub.resolves({ data: 'mockResponse' });

      const result = await gitLabAPI.query(document, variables);

      expect(requestStub).to.have.been.calledOnceWithExactly(document, {
        key: 'value',
        projectId: 'group/project'
      });

      expect(result).to.deep.equal({ data: 'mockResponse' });
    });

    it('should throw an error if the query fails', async () => {
      const document = `query TestQuery { field }`;
      const variables = { key: 'value' };

      requestStub.rejects(new Error('GraphQL error'));

      try {
        await gitLabAPI.query(document, variables);
        throw new Error('Test failed: expected query to throw an error');
      } catch (err) {
        expect(err).to.be.an.instanceOf(Error);
        expect(err.message).to.equal('GraphQL error');
        expect(requestStub).to.have.been.calledOnceWithExactly(document, {
          key: 'value',
          projectId: 'group/project'
        });
      }
    });
  });

  describe('queryAll', () => {
    let gitLabAPI;
    let repositoryMock;
    let requestStub;
    const document = `query TestQuery { field }`;

    const mockExtractorFunction = result => ({
      nodes: result.data.nodes,
      pageInfo: result.data.pageInfo
    });

    beforeEach(() => {
      repositoryMock = new RepositoryMock('https://example.com/group/project');
      gitLabAPI = new GitLabAPIMock(repositoryMock);

      // Stub GraphQLClient's request method
      requestStub = sinon.stub(gitLabAPI.graphqlClient, 'request');
    });

    afterEach(() => {
      requestStub.restore();
    });

    it('should fetch all pages of data successfully', async () => {
      const page1Result = {
        data: {
          nodes: [{ id: 1 }, { id: 2 }],
          pageInfo: { hasNextPage: true, endCursor: 'cursor1' }
        }
      };

      const page2Result = {
        data: {
          nodes: [{ id: 3 }],
          pageInfo: { hasNextPage: false, endCursor: null }
        }
      };

      requestStub.onCall(0).resolves(page1Result);
      requestStub.onCall(1).resolves(page2Result);

      const variables = {};
      const results = await gitLabAPI.queryAll(document, mockExtractorFunction, variables);

      expect(requestStub).to.have.been.calledTwice;

      expect(results).to.deep.equal([{ id: 1 }, { id: 2 }, { id: 3 }]);
    });

    it('should handle a single page of data', async () => {
      const singlePageResult = {
        data: {
          nodes: [{ id: 1 }],
          pageInfo: { hasNextPage: false, endCursor: null }
        }
      };

      requestStub.resolves(singlePageResult);

      const variables = { key: 'value' }; // Input object

      const results = await gitLabAPI.queryAll(document, mockExtractorFunction, variables);

      expect(requestStub).to.have.been.calledOnceWithExactly(document, {
        key: 'value',
        projectId: 'group/project',
        endCursor: null
      });

      expect(results).to.deep.equal([{ id: 1 }]);
    });

    it('should throw an error if a query fails during pagination', async () => {
      const page1Result = {
        data: {
          nodes: [{ id: 1 }],
          pageInfo: { hasNextPage: true, endCursor: 'cursor1' }
        }
      };

      requestStub.onCall(0).resolves(page1Result);
      requestStub.onCall(1).rejects(new Error('GraphQL error on page 2'));

      const variables = {};

      try {
        await gitLabAPI.queryAll(document, mockExtractorFunction, variables);
        throw new Error('Test failed: expected queryAll to throw an error');
      } catch (err) {
        expect(err).to.be.an.instanceOf(Error);
        expect(err.message).to.equal('GraphQL error on page 2');
        expect(requestStub).to.have.been.calledTwice;
      }
    });
  });

  describe('loadPublicName', () => {
    let gitLabAPI;

    beforeEach(() => {
      const mockUrl = 'https://example.com/group/project';
      repositoryInstance = new RepositoryMock(mockUrl);
      gitLabAPI = new GitLabAPIMock(repositoryInstance);
    });

    it('should fetch and return the project name', async () => {
      const projectName = 'test-project';
      const mockFetchResponse = {
        data: { name: projectName }
      };

      sinon.stub(gitLabAPI, 'fetch').resolves(mockFetchResponse);

      const name = await gitLabAPI.loadPublicName();

      expect(name).to.equal(projectName);
      expect(gitLabAPI.fetch).to.have.been.calledWith('/projects/:id');
    });

    it('should throw an error if the fetch fails', async () => {
      const errorMessage = 'Some error occurred';
      const error = new Error(errorMessage);

      sinon.stub(gitLabAPI, 'fetch').rejects(error);

      try {
        await gitLabAPI.loadPublicName();

        expect.fail('Expected loadPublicName to throw an error');
      } catch (e) {
        expect(e.message).to.equal(
          `Could not access project information for repo '${gitLabAPI.baseURL}'`
        );
        expect(e.cause).to.equal(error);
      }
    });
  });

  describe('checkAuthToken', () => {
    let gitLabAPI;
    let fetchStub;

    beforeEach(() => {
      const repositoryMock = new RepositoryMock('https://example.com/group/project');
      gitLabAPI = new GitLabAPIMock(repositoryMock);
      fetchStub = sinon.stub(global, 'fetch');
    });

    afterEach(() => {
      fetchStub.restore();
    });

    it('should return 200 when the token is valid and has required scopes', async () => {
      const mockTokenResponse = {
        scopes: ['api', 'read_repository'],
        user_id: 12345
      };

      const mockMemberResponse = { ok: true };

      fetchStub
        .onCall(0)
        .resolves({ ok: true, json: () => mockTokenResponse }) // Personal access token endpoint
        .onCall(1)
        .resolves(mockMemberResponse); // Project member check endpoint

      const result = await gitLabAPI.checkAuthToken();

      expect(result.status).to.equal(200);
      expect(result.message).to.be.undefined;

      expect(fetchStub).to.have.been.calledWith(
        `${gitLabAPI.baseURL}/api/v4/personal_access_tokens/self`
      );
      expect(fetchStub).to.have.been.calledWith(
        `${gitLabAPI.baseURL}/api/v4/projects/${gitLabAPI.encodedProjectId}/members/12345`
      );
    });

    it('should return 400 when token does not have required scopes', async () => {
      const mockTokenResponse = {
        scopes: ['api'],
        user_id: 12345
      };

      fetchStub.onCall(0).resolves({ ok: true, json: () => mockTokenResponse }); // Personal access token endpoint

      const result = await gitLabAPI.checkAuthToken();

      expect(result.status).to.equal(400);
      expect(result.message).to.include("Invalid token: Token doesn't have the required scopes");

      expect(fetchStub).to.have.been.calledWith(
        `${gitLabAPI.baseURL}/api/v4/personal_access_tokens/self`
      );
    });

    it('should return 400 when the token is not a member of the repository', async () => {
      const mockTokenResponse = {
        scopes: ['api', 'read_repository'],
        user_id: 12345
      };

      const mockMemberResponse = { ok: false, status: 404 };

      fetchStub
        .onCall(0)
        .resolves({ ok: true, json: () => mockTokenResponse }) // Personal access token endpoint
        .onCall(1)
        .resolves(mockMemberResponse); // Project member check endpoint

      const result = await gitLabAPI.checkAuthToken();

      expect(result.status).to.equal(400);
      expect(result.message).to.include('Invalid token: Token is not a member of repo');

      expect(fetchStub).to.have.been.calledWith(
        `${gitLabAPI.baseURL}/api/v4/personal_access_tokens/self`
      );
      expect(fetchStub).to.have.been.calledWith(
        `${gitLabAPI.baseURL}/api/v4/projects/${gitLabAPI.encodedProjectId}/members/12345`
      );
    });

    it('should return 400 if the personal access token endpoint returns an error', async () => {
      fetchStub
        .onCall(0)
        .resolves({ ok: false, status: 404, text: sinon.stub().resolves('Not Found') });

      const result = await gitLabAPI.checkAuthToken();

      expect(result.status).to.equal(400);
      expect(result.message).to.include('Invalid token: Cannot access token information');
    });
  });
});
