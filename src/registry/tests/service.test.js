import { expect } from 'chai';
import sinon from 'sinon';
import { postService, deleteService, putService, getService } from '../routes/service.js';
import { Registry } from '../lib/registry.js';
import { initLogger } from '../../common/logger.js';

describe('Service Routes', () => {
  let req, res, serviceStub;

  beforeEach(async () => {
    try { await initLogger(false) } catch(e) {}
    
    req = {
      params: { name: 'service1', id: 'instance1' },
      body: {
        hostname: 'host1',
        healthCheck: 'http://host1/health',
        data: {}
      }
    };
    res = {
      status: sinon.stub().returnsThis(),
      send: sinon.stub(),
      end: sinon.stub(),
      json: sinon.stub(),
      sendStatus: sinon.stub()
    };
    serviceStub = {
      createInstance: sinon.stub(),
      removeInstance: sinon.stub(),
      updateInstance: sinon.stub(),
      serviceData: sinon.stub()
    };
    sinon.stub(Registry, 'the').returns({
      ensureService: sinon.stub().returns(serviceStub),
      service: sinon.stub().returns(serviceStub)
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('postService', () => {
    it('should create a service instance and return its id', () => {
      serviceStub.createInstance.returns('instance1');
      postService(req, res);
      expect(serviceStub.createInstance.calledWith('host1', 'http://host1/health', {})).to.be.true;
      expect(res.json.calledWith({ id: 'instance1' })).to.be.true;
    });

    it('should return 422 if validation fails', () => {
      req.body = {};
      postService(req, res);
      expect(res.status.calledWith(422)).to.be.true;
      expect(res.send.called).to.be.true;
    });

    it('should return 409 if duplicate hostname', () => {
      serviceStub.createInstance.returns(null);
      postService(req, res);
      expect(res.status.calledWith(409)).to.be.true;
      expect(res.send.calledWith("Duplicate hostname 'host1' for service 'service1'")).to.be.true;
    });
  });

  describe('deleteService', () => {
    it('should remove a service instance and send status 200', () => {
      serviceStub.removeInstance.returns(true);
      deleteService(req, res);
      expect(serviceStub.removeInstance.calledWith('instance1')).to.be.true;
      expect(res.sendStatus.calledWith(200)).to.be.true;
    });

    it('should return 404 if service is not found', () => {
      Registry.the().service.returns(null);
      deleteService(req, res);
      expect(res.status.calledWith(404)).to.be.true;
      expect(res.end.calledWith("Unknown service 'service1'\n")).to.be.true;
    });

    it('should return 404 if instance is not found', () => {
      serviceStub.removeInstance.returns(false);
      deleteService(req, res);
      expect(res.status.calledWith(404)).to.be.true;
      expect(res.end.calledWith("Unknown service instance 'service1/instance1'\n")).to.be.true;
    });
  });

  describe('putService', () => {
    it('should update a service instance and send status 200', () => {
      serviceStub.updateInstance.returns(true);
      putService(req, res);
      expect(serviceStub.updateInstance.calledWith('instance1', 'host1', 'http://host1/health', {}))
        .to.be.true;
      expect(res.sendStatus.calledWith(200)).to.be.true;
    });

    it('should return 422 if validation fails', () => {
      req.body = {};
      putService(req, res);
      expect(res.status.calledWith(422)).to.be.true;
      expect(res.send.called).to.be.true;
    });

    it('should return 404 if service is not found', () => {
      Registry.the().service.returns(null);
      putService(req, res);
      expect(res.status.calledWith(404)).to.be.true;
      expect(res.end.calledWith("Unknown service 'service1'\n")).to.be.true;
    });

    it('should return 404 if instance is not found', () => {
      serviceStub.updateInstance.returns(false);
      putService(req, res);
      expect(res.status.calledWith(404)).to.be.true;
      expect(res.end.calledWith("Unknown service instance 'service1/instance1'\n")).to.be.true;
    });
  });

  describe('getService', () => {
    it('should return service data', () => {
      const serviceData = { name: 'service1' };
      serviceStub.serviceData.returns(serviceData);
      getService(req, res);
      expect(res.json.calledWith(serviceData)).to.be.true;
    });

    it('should return 404 if service is not found', () => {
      Registry.the().service.returns(null);
      getService(req, res);
      expect(res.status.calledWith(404)).to.be.true;
      expect(res.end.calledWith("Unknown service 'service1'\n")).to.be.true;
    });
  });
});
