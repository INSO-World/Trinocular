import {expect} from 'chai';
import sinon from 'sinon';
import esmock from 'esmock';

describe('Session Authentication Module', () => {
  let sessionAuthentication;
  let protectedPage;
  let protectedApi;
  let protectedOrInternal;
  let mockPassport;
  let apiRequestIsAuthenticatedStub;

  beforeEach(async () => {
    // Mock dependencies
    mockPassport = {
      initialize: sinon.stub().returns((req, res, next) => next()),
      session: sinon.stub().returns((req, res, next) => next()),
    };

    const mockConnectMemcached = sinon.stub().returns(function MemcachedStore() {
      return {
        on: sinon.stub(),
        set: sinon.stub(),
        get: sinon.stub(),
        destroy: sinon.stub(),
      };
    });
    const apiRequestIsAuthenticatedFake = function (req) {
      const authHeader = req.headers['authorization'];
      return authHeader && authHeader === 'Bearer test';
    }
    apiRequestIsAuthenticatedStub = sinon.stub().callsFake(apiRequestIsAuthenticatedFake);

    ({
      sessionAuthentication,
      protectedPage,
      protectedApi,
      protectedOrInternal,
    } = await esmock('../index.js', {
      passport: mockPassport,
      'connect-memcached': mockConnectMemcached,
      '../../common/index.js': {
        apiRequestIsAuthenticated: apiRequestIsAuthenticatedStub
      },
    }));
  });

  describe('sessionAuthentication', () => {
    it('should setup array of middlewares', () => {
      process.env.MEMCACHED_HOST = 'localhost';
      process.env.SESSION_SECRET = 'secret';

      const middleware = sessionAuthentication();

      expect(middleware).to.be.an('array');
      expect(middleware).to.have.lengthOf(3);
      expect(mockPassport.initialize.calledOnce).to.be.true;
      expect(mockPassport.session.calledOnce).to.be.true;
    });
  });

  describe('protectedPage', () => {
    it('should call next() if user is authenticated', (done) => {
      const req = {isAuthenticated: sinon.stub().returns(true)};
      const res = {
        redirect: sinon.stub(),
      };
      const next = sinon.stub();

      protectedPage(req, res, next);

      expect(req.isAuthenticated.calledOnce).to.be.true;
      expect(next.calledOnce).to.be.true;
      expect(res.redirect.called).to.be.false;
      done();
    });

    it('should redirect if user is not authenticated', (done) => {
      const req = {
        isAuthenticated: sinon.stub().returns(false),
        app: {get: sinon.stub().returns('/')},
      };
      const res = {
        redirect: sinon.stub(),
      };

      protectedPage(req, res, () => {
      });

      expect(res.redirect.calledWith('/')).to.be.true;
      expect(res.redirect.calledOnce).to.be.true;
      done();
    });
  });

  describe('protectedApi', () => {
    it('should call next() if user is authenticated', (done) => {
      const req = {isAuthenticated: sinon.stub().returns(true)};
      const res = {
        sendStatus: sinon.stub(),
      };
      const next = sinon.stub();

      protectedApi(req, res, next);

      expect(req.isAuthenticated.calledOnce).to.be.true;
      expect(next.calledOnce).to.be.true;
      expect(res.sendStatus.calledWith(401)).to.be.false;
      done();
    });

    it('should send 401 if user is not authenticated', (done) => {
      const req = {isAuthenticated: sinon.stub().returns(false)};
      const res = {
        sendStatus: sinon.stub(),
      };
      const next = sinon.stub();

      protectedApi(req, res, next);

      expect(req.isAuthenticated.calledOnce).to.be.true;
      expect(next.called).to.be.false;
      expect(res.sendStatus.calledWith(401)).to.be.true;
      done();
    });
  });

  describe('protectedOrInternal', () => {
    it('should call next() if user is authenticated', (done) => {
      const req = {isAuthenticated: sinon.stub().returns(true)};
      const res = {};
      const next = sinon.stub();

      protectedOrInternal(req, res, next);

      expect(req.isAuthenticated.calledOnce).to.be.true;
      expect(apiRequestIsAuthenticatedStub.called).to.be.false;
      expect(next.calledOnce).to.be.true;
      done();
    });

    it('should call next() if request is internal', (done) => {
      const req = {
        isAuthenticated: sinon.stub().returns(false),
        headers: {authorization: 'Bearer test'}
      };

      const res = {};
      const next = sinon.stub();

      protectedOrInternal(req, res, next);

      expect(next.calledOnce).to.be.true;
      expect(req.isAuthenticated.calledOnce).to.be.true
      expect(apiRequestIsAuthenticatedStub.calledOnce).to.be.true;
      done();
    });

    it('should send 401 if user is neither authenticated nor internal', (done) => {
      const req = {
        isAuthenticated: sinon.stub().returns(false),
        headers: {authorization: 'Bearer Not correct'}
      };
      const res = {
        sendStatus: sinon.stub()
      };

      protectedOrInternal(req, res, () => {
      });

      expect(res.sendStatus.calledWith(401)).to.be.true;
      expect(req.isAuthenticated.calledOnce).to.be.true
      expect(apiRequestIsAuthenticatedStub.calledOnce).to.be.true;
      done();
    });
  });
});
