import { expect } from 'chai';
import sinon from 'sinon';
import request from 'supertest';
import express from 'express';
import { routes } from '../routes/routes.js';
import { Registry } from '../lib/registry.js';

describe('Routes', () => {
  let app, serverStub;
  let commonHeaders;

  beforeEach(() => {
    process.env.INTERNAL_API_SECRET= 'some-secret-value';

    commonHeaders = {
      Authorization: `bearer ${process.env.INTERNAL_API_SECRET}`
    };

    app = express();
    app.use(express.json());
    app.use(routes);

    serverStub = {
      createInstance: sinon.stub(),
      removeInstance: sinon.stub(),
      updateInstance: sinon.stub(),
      serviceData: sinon.stub(),
      broadcast: sinon.stub(),
      addNotifySubscriber: sinon.stub(),
      removeNotifySubscriber: sinon.stub()
    };

    sinon.stub(Registry, 'the').returns({
      ensureService: sinon.stub().returns(serverStub),
      service: sinon.stub().returns(serverStub)
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should return 401 with wrong/missing auth', () => {
    return request(app)
      .get('/service/service1')
      .expect(401)
      .expect(res => {
        expect(res.text).to.equal('Unauthorized');
      });
  });

  describe('GET /service/:name', () => {
    it('should return service data', async () => {
      const serviceData = { name: 'service1' };
      serverStub.serviceData.returns(serviceData);

      await request(app)
        .get('/service/service1')
        .set(commonHeaders)
        .expect(200)
        .expect(res => {
          expect(res.body).to.deep.equal(serviceData);
        });
    });

    it('should return 404 if service is not found', async () => {
      Registry.the().service.returns(null);

      await request(app)
        .get('/service/service1')
        .set(commonHeaders)
        .expect(404)
        .expect(res => {
          expect(res.text).to.equal("Unknown service 'service1'\n");
        });
    });
  });

  describe('POST /service/:name', () => {
    it('should create a service instance and return its id', async () => {
      serverStub.createInstance.returns('instance1');

      await request(app)
        .post('/service/service1')
        .set(commonHeaders)
        .send({
          hostname: 'host1',
          healthCheck: 'http://host1/health',
          data: {}
        })
        .expect(200)
        .expect(res => {
          expect(res.body).to.deep.equal({ id: 'instance1' });
        });
    });

    it('should return 422 if validation fails', async () => {
      await request(app).post('/service/service1').set(commonHeaders).send({}).expect(422);
    });

    it('should return 409 if duplicate hostname', async () => {
      serverStub.createInstance.returns(null);

      await request(app)
        .post('/service/service1')
        .set(commonHeaders)
        .send({
          hostname: 'host1',
          healthCheck: 'http://host1/health',
          data: {}
        })
        .expect(409)
        .expect(res => {
          expect(res.text).to.equal("Duplicate hostname 'host1' for service 'service1'");
        });
    });
  });

  describe('PUT /service/:name/:id', () => {
    it('should update a service instance and send status 200', async () => {
      serverStub.updateInstance.returns(true);

      await request(app)
        .put('/service/service1/instance1')
        .set(commonHeaders)
        .send({
          hostname: 'host1',
          healthCheck: 'http://host1/health',
          data: {}
        })
        .expect(200);
    });

    it('should return 422 if validation fails', async () => {
      await request(app).put('/service/service1/instance1').set(commonHeaders).send({}).expect(422);
    });

    it('should return 404 if service is not found', async () => {
      Registry.the().service.returns(null);

      await request(app)
        .put('/service/service1/instance1')
        .set(commonHeaders)
        .send({
          hostname: 'host1',
          healthCheck: 'http://host1/health',
          data: {}
        })
        .expect(404)
        .expect(res => {
          expect(res.text).to.equal("Unknown service 'service1'\n");
        });
    });

    it('should return 404 if instance is not found', async () => {
      serverStub.updateInstance.returns(false);

      await request(app)
        .put('/service/service1/instance1')
        .set(commonHeaders)
        .send({
          hostname: 'host1',
          healthCheck: 'http://host1/health',
          data: {}
        })
        .expect(404)
        .expect(res => {
          expect(res.text).to.equal("Unknown service instance 'service1/instance1'\n");
        });
    });
  });

  describe('DELETE /service/:name/:id', () => {
    it('should remove a service instance and send status 200', async () => {
      serverStub.removeInstance.returns(true);

      await request(app).delete('/service/service1/instance1').set(commonHeaders).expect(200);
    });

    it('should return 404 if service is not found', async () => {
      Registry.the().service.returns(null);

      await request(app)
        .delete('/service/service1/instance1')
        .set(commonHeaders)
        .expect(404)
        .expect(res => {
          expect(res.text).to.equal("Unknown service 'service1'\n");
        });
    });

    it('should return 404 if instance is not found', async () => {
      serverStub.removeInstance.returns(false);

      await request(app)
        .delete('/service/service1/instance1')
        .set(commonHeaders)
        .expect(404)
        .expect(res => {
          expect(res.text).to.equal("Unknown service instance 'service1/instance1'\n");
        });
    });
  });

  describe('POST /service/:name/notify/:subscriber/broadcast/*', () => {
    it('should add a notify subscriber and send status 200', async () => {
      await request(app)
        .post('/service/service1/notify/subscriber1/broadcast/somepath')
        .set(commonHeaders)
        .expect(200);
    });
  });

  describe('DELETE /service/:name/notify/:subscriber/broadcast/*', () => {
    it('should remove a notify subscriber and send status 200', async () => {
      serverStub.removeNotifySubscriber.returns(true);

      await request(app)
        .delete('/service/service1/notify/subscriber1/broadcast/somepath')
        .set(commonHeaders)
        .expect(200);
    });

    it('should return 404 if notifier is not found', async () => {
      serverStub.removeNotifySubscriber.returns(false);

      await request(app)
        .delete('/service/service1/notify/subscriber1/broadcast/somepath')
        .set(commonHeaders)
        .expect(404)
        .expect(res => {
          expect(res.text).to.equal(
            "Unknown notifier 'subscriber1/broadcast: /somepath' on service 'service1'\n"
          );
        });
    });
  });

  describe('ALL /service/:name/broadcast/*', () => {
    it('should send status 200 if broadcast is successful', async () => {
      serverStub.broadcast.resolves(true);

      await request(app)
        .post('/service/service1/broadcast/somepath')
        .set(commonHeaders)
        .expect(200);
    });

    it('should send status 502 if broadcast fails', async () => {
      serverStub.broadcast.resolves(false);

      await request(app)
        .post('/service/service1/broadcast/somepath')
        .set(commonHeaders)
        .expect(502);
    });

    it('should return 404 if service is not found', async () => {
      Registry.the().service.returns(null);

      await request(app)
        .post('/service/service1/broadcast/somepath')
        .set(commonHeaders)
        .expect(404)
        .expect(res => {
          expect(res.text).to.equal("Unknown service 'service1'\n");
        });
    });
  });
});
