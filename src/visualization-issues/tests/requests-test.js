import { expect } from 'chai';
import esmock from 'esmock';

describe('Requests to API Bridge', () => {
  let getDatasourceForRepositoryFromApiBridge;
  let getRepositoryForUuid;

  let fetchStub;
  let apiAuthHeaderStub;
  let fetchBehavior;

  before(() => {
    // Set environment variable for API bridge name
    process.env.API_BRIDGE_NAME = 'api-bridge';
  });

  beforeEach(async () => {
    fetchBehavior = {
      ok: true,
      jsonData: [{ id: 1, name: 'Test item' }],
      textData: 'Some error message',
      throwError: false
    };

    fetchStub = async (url, options) => {
      if (fetchBehavior.throwError) {
        throw new Error('Network error');
      }

      return {
        ok: fetchBehavior.ok,
        json: async () => fetchBehavior.jsonData,
        text: async () => fetchBehavior.textData
      };
    };

    apiAuthHeaderStub = init => {
      return {
        ...init,
        headers: {
          ...init.headers,
          Authorization: 'Bearer mock-token'
        }
      };
    };

    const mod = await esmock('../lib/requests.js', {
      '../../common/index.js': { apiAuthHeader: apiAuthHeaderStub },
      import: { fetch: fetchStub }
    });

    getDatasourceForRepositoryFromApiBridge = mod.getDatasourceForRepositoryFromApiBridge;
    getRepositoryForUuid = mod.getRepositoryForUuid;
  });

  beforeEach(() => {
    fetchBehavior.ok = true;
    fetchBehavior.jsonData = [{ id: 1, name: 'Test item' }];
    fetchBehavior.textData = 'Some error message';
    fetchBehavior.throwError = false;
  });

  describe('getDatasourceForRepositoryFromApiBridge', () => {
    it('should return data when fetch is successful', async () => {
      fetchBehavior.jsonData = [{ id: 1, issue: 'Issue #1' }];
      const result = await getDatasourceForRepositoryFromApiBridge('issues', 'uuid-123');
      expect(result).to.deep.equal({ data: [{ id: 1, issue: 'Issue #1' }] });
    });

    it('should return an error when fetch returns non-OK status', async () => {
      fetchBehavior.ok = false;
      fetchBehavior.textData = 'Not Found';
      const result = await getDatasourceForRepositoryFromApiBridge('issues', 'uuid-123');
      expect(result.error).to.include(
        'Could not get datasource issues for repository uuid-123 from API service: Not Found'
      );
    });

    it('should return an error when fetch throws an exception', async () => {
      fetchBehavior.throwError = true;
      const result = await getDatasourceForRepositoryFromApiBridge('issues', 'uuid-123');
      expect(result.error).to.equal('Could not connect to API service');
    });
  });

  describe('getRepositoryForUuid', () => {
    it('should return data when fetch is successful', async () => {
      fetchBehavior.jsonData = [{ uuid: 'uuid-123', name: 'Test Repo' }];
      const result = await getRepositoryForUuid('uuid-123');
      expect(result).to.deep.equal({ data: [{ uuid: 'uuid-123', name: 'Test Repo' }] });
    });

    it('should return an error when fetch returns non-OK status', async () => {
      fetchBehavior.ok = false;
      fetchBehavior.textData = 'Not Found';
      const result = await getRepositoryForUuid('uuid-123');
      expect(result.error).to.include(
        'Could not get datasource details for repository uuid-123 from API service: Not Found'
      );
    });

    it('should return an error when fetch throws an exception', async () => {
      fetchBehavior.throwError = true;
      const result = await getRepositoryForUuid('uuid-123');
      expect(result.error).to.equal('Could not connect to API service');
    });
  });
});
