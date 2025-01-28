import { expect } from 'chai';
import sinon from 'sinon';
import { broadcast } from '../routes/broadcast.js';
import { Registry } from '../lib/registry.js';
// Can't stub/mock this because problems with ES modules
// import * as util from '../lib/util.js';

describe('Broadcast Route', () => {
  let req, res, serviceStub;

  beforeEach(() => {
    req = {
      params: { name: 'service1' },
      path: '/notify/service1/broadcast/broadcastPath',
      method: 'POST',
      query: {},
      body: {}
    };
    res = {
      sendStatus: sinon.stub(),
      status: sinon.stub().returnsThis(),
      end: sinon.stub()
    };
    serviceStub = {
      broadcast: sinon.stub()
    };
    sinon.stub(Registry, 'the').returns({
      service: sinon.stub().returns(serviceStub)
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('broadcast', () => {
    it('should send status 200 if broadcast is successful', async () => {
      serviceStub.broadcast.resolves(true);
      await broadcast(req, res);
      expect(serviceStub.broadcast.calledWith('POST', '/broadcastPath', {}, {})).to.be.true;
      expect(res.sendStatus.calledWith(200)).to.be.true;
    });

    it('should send status 502 if broadcast fails', async () => {
      serviceStub.broadcast.resolves(false);
      await broadcast(req, res);
      expect(serviceStub.broadcast.calledWith('POST', '/broadcastPath', {}, {})).to.be.true;
      expect(res.sendStatus.calledWith(502)).to.be.true;
    });

    it('should return 404 if service is not found', async () => {
      Registry.the().service.returns(null);
      await broadcast(req, res);
      expect(res.status.calledWith(404)).to.be.true;
      expect(res.end.calledWith("Unknown service 'service1'\n")).to.be.true;
    });
  });
});
