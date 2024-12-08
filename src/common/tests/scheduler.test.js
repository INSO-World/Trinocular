import { expect } from 'chai';
import sinon from 'sinon';
import esmock from 'esmock';

describe('Scheduler Functions', () => {
  let fetchStub;

  async function mockGlobalFetch() {
    return await esmock('../scheduler.js', {
      import: {
        fetch: fetchStub
      }
    });
  }

  beforeEach(() => {
    fetchStub= sinon.stub();
    process.env= {
      SCHEDULER_NAME: 'scheduler',
      SERVICE_NAME: 'service_name',
      INTERNAL_API_SECRET: 'a-secret-string'
    }
  });

  describe('sendSchedulerCallback', () => {
    it('sends callback with status', async () => {
      const { sendSchedulerCallback } = await mockGlobalFetch();

      const response= {ok: true, status: 200};
      fetchStub.returns( Promise.resolve( response ) );

      const transactionId= 'abcdefg', status= 'ok';
      const success= await sendSchedulerCallback(transactionId, status);

      expect(success).to.be.true;
      expect(fetchStub.calledOnce).to.be.true;

      const fetchCall= fetchStub.getCall(0);
      const [fetchUrl, options]= fetchCall.args;

      expect(options).to.deep.equal({
        method: 'POST',
        headers: { authorization: 'bearer a-secret-string' }
      });

      expect(() => new URL(fetchUrl)).to.not.throw;
      const url= new URL(fetchUrl);
      expect(url.origin).to.equal('http://scheduler');
      expect(url.pathname).to.equal(`/task/${transactionId}/callback/service_name`);
      expect(url.searchParams.size).to.equal(1);
      expect(url.searchParams.get('status')).to.equal(status);
    });

    it('fails on bad response status', async () => {
      const { sendSchedulerCallback } = await mockGlobalFetch();

      const response= {ok: false, status: 400};
      fetchStub.returns( Promise.resolve( response ) );

      const transactionId= 'abcdefg', status= 'ok';
      const success= await sendSchedulerCallback(transactionId, status);

      expect(success).to.be.false;
      expect(fetchStub.calledOnce).to.be.true;
    });
  });
});
