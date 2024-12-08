import { expect } from 'chai';
import sinon from 'sinon';
import { apiRequestIsAuthenticated, apiAuthHeader, internalApi } from '../api.js';

describe('API functions', () => {
  const internalApiSecret = 'a-secret-string';
  let req, res, next;

  beforeEach(() => {
    req = {
      header: sinon.stub().returns(null)
    };
    res = {
      sendStatus: sinon.stub(),
      status: sinon.stub().returnsThis(),
      end: sinon.stub()
    };
    next = sinon.stub();
    process.env.INTERNAL_API_SECRET = internalApiSecret;
  });

  describe('apiAuthHeader', () => {
    it('Adds the internal API secret to the headers', () => {
      const token = `bearer ${internalApiSecret}`;
      expect(apiAuthHeader()).to.have.deep.property('headers', { authorization: token });
    });

    it('Keep other options', () => {
      const token = `bearer ${internalApiSecret}`;
      expect(apiAuthHeader({
        headers: { myHeader: 123 },
        method: 'POST'
      })).to.deep.equal({
        headers: { authorization: token, myHeader: 123 },
        method: 'POST'
      });
    });
  });

  describe('internalApi', () => {
    it('allows authorized requests', () => {
      req.header.withArgs('authorization').returns(`bearer ${internalApiSecret}`)
      
      internalApi( req, res, next );

      expect(next.calledOnce).to.be.true;
      expect(res.end.called).to.be.false;
    });

    it(`accepts 'bearer' case-insensitive`, () => {
      req.header.withArgs('authorization').returns(`Bearer ${internalApiSecret}`)
      
      internalApi( req, res, next );

      expect(next.calledOnce).to.be.true;
      expect(res.end.called).to.be.false;
    });

    it(`rejects unauthenticated request`, () => {
      internalApi( req, res, next );

      expect(next.called).to.be.false;
      expect(res.end.calledOnce).to.be.true;
      expect(res.status.calledWith(401)).to.be.true;
    });

    it(`rejects malformed authorization header`, () => {
      req.header.withArgs('authorization').returns(`Bearer dummy`)

      internalApi( req, res, next );

      expect(next.called).to.be.false;
      expect(res.end.calledOnce).to.be.true;
      expect(res.status.calledWith(401)).to.be.true;
    });

    it('requires API secret to be present', () => {
      process.env.INTERNAL_API_SECRET = '';
      req.header.withArgs('authorization').returns(`Bearer `)

      internalApi( req, res, next );

      expect(next.called).to.be.false;
      expect(res.end.calledOnce).to.be.true;
      expect(res.status.calledWith(401)).to.be.true;
    });
  });
});
