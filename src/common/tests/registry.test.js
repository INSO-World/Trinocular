import { expect } from 'chai';
import sinon from 'sinon';
import esmock from 'esmock';

describe('Registry Functions', () => {
  let fetchStub;
  let setTimeoutStub;
  let responseStub;

  async function mockGlobalFetch() {
    return await esmock('../registry.js', {
      import: {
        fetch: fetchStub,
        setTimeout: setTimeoutStub
      }
    });
  }

  beforeEach(() => {
    fetchStub = sinon.stub();
    setTimeoutStub = sinon.stub().callsArg(0);
    responseStub = {
      ok: true,
      status: 200,
      text: sinon.stub(),
      json: sinon.stub()
    };
    process.env = {
      REGISTRY_NAME: 'registry_name',
      INTERNAL_API_SECRET: 'a-secret-string'
    };
  });

  describe('registerService', () => {
    it('registers service on registry', async () => {
      const { registerService } = await mockGlobalFetch();

      fetchStub.returns(Promise.resolve(responseStub));
      responseStub.json.returns(Promise.resolve({ id: 123 }));

      const serviceName = 'service_name',
        hostname = 'hostname',
        data = { a: 1, b: 2 };
      const id = await registerService(serviceName, hostname, data);

      expect(id).to.equal(123);
      expect(fetchStub.calledOnce).to.be.true;
      expect(setTimeoutStub.called).to.be.false;

      const fetchCall = fetchStub.getCall(0);
      const [fetchUrl, options] = fetchCall.args;

      expect(options).to.deep.equal({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: 'bearer a-secret-string'
        },
        body: JSON.stringify({ hostname, healthCheck: '/health', data })
      });

      expect(() => new URL(fetchUrl)).to.not.throw;
      const url = new URL(fetchUrl);
      expect(url.origin).to.equal('http://registry_name');
      expect(url.pathname).to.equal(`/service/${serviceName}`);
      expect(url.searchParams.size).to.equal(0);
    });

    it('throws on bad response status', async () => {
      const { registerService } = await mockGlobalFetch();

      fetchStub.returns(Promise.resolve(responseStub));
      responseStub.ok = false;
      responseStub.status = 400;
      responseStub.text.returns(Promise.resolve('an error message'));

      const serviceName = 'service_name',
        hostname = 'hostname',
        data = { a: 1, b: 2 };
      expect(async () => await registerService(serviceName, hostname, data)).to.throw;
    });

    it('retries on fetch error', async () => {
      const { registerService } = await mockGlobalFetch();
      fetchStub.onCall(0).throws(Error('Fake fetch error'));
      fetchStub.onCall(1).throws(Error('Fake fetch error'));
      fetchStub.onCall(2).returns(Promise.resolve(responseStub));
      responseStub.json.returns(Promise.resolve({ id: 123 }));

      const serviceName = 'service_name',
        hostname = 'hostname',
        data = { a: 1, b: 2 };
      const id = await registerService(serviceName, hostname, data);

      expect(id).to.equal(123);
      expect(fetchStub.callCount).to.equal(3);
      expect(setTimeoutStub.callCount).to.equal(2);
    });
  });

  describe('registerNotification', () => {
    it('registers notification on registry', async () => {
      const { registerNotification } = await mockGlobalFetch();

      fetchStub.returns(Promise.resolve(responseStub));

      const serviceName = 'service_name',
        subscriberName = 'subscriber_name';
      const path = '/an/endpoint/to/call';
      await registerNotification(serviceName, subscriberName, path);

      expect(fetchStub.calledOnce).to.be.true;
      expect(setTimeoutStub.called).to.be.false;

      const fetchCall = fetchStub.getCall(0);
      const [fetchUrl, options] = fetchCall.args;

      expect(options).to.deep.equal({
        method: 'POST',
        headers: {
          authorization: 'bearer a-secret-string'
        }
      });

      expect(() => new URL(fetchUrl)).to.not.throw;
      const url = new URL(fetchUrl);
      expect(url.origin).to.equal('http://registry_name');
      expect(url.pathname).to.equal(
        `/service/${serviceName}/notify/${subscriberName}/broadcast/${path}`
      );
    });

    it('throws on bad response status', async () => {
      const { registerNotification } = await mockGlobalFetch();

      fetchStub.returns(Promise.resolve(responseStub));
      responseStub.ok = false;
      responseStub.status = 400;
      responseStub.text.returns(Promise.resolve('an error message'));

      const serviceName = 'service_name',
        subscriberName = 'subscriber_name';
      const path = '/an/endpoint/to/call';
      expect(async () => await registerNotification(serviceName, subscriberName, path)).to.throw;
    });

    it('retries on fetch error', async () => {
      const { registerNotification } = await mockGlobalFetch();
      fetchStub.onCall(0).throws(Error('Fake fetch error'));
      fetchStub.onCall(1).throws(Error('Fake fetch error'));
      fetchStub.onCall(2).returns(Promise.resolve(responseStub));
      responseStub.json.returns(Promise.resolve({ id: 123 }));

      const serviceName = 'service_name',
        subscriberName = 'subscriber_name';
      const path = '/an/endpoint/to/call';
      await registerNotification(serviceName, subscriberName, path);

      expect(fetchStub.callCount).to.equal(3);
      expect(setTimeoutStub.callCount).to.equal(2);
    });
  });
});
