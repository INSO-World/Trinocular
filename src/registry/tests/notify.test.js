import { expect } from 'chai';
import sinon from 'sinon';
import { postNotify, deleteNotify } from '../routes/notify.js';
import { Registry } from '../lib/registry.js';
// Can't stub/mock this because problems with ES modules
// import {getSubPath} from '../lib/util.js';

describe('Notify Routes', () => {
    let req, res, serviceStub;
    let util;

    beforeEach(() => {
        req = {
            params: { name: 'service1', subscriber: 'subscriber1' },
            path: '/notify/subscriber1/broadcast/broadcastPath'
        };
        res = {
            sendStatus: sinon.stub(),
            status: sinon.stub().returnsThis(),
            end: sinon.stub()
        };
        serviceStub = {
            addNotifySubscriber: sinon.stub(),
            removeNotifySubscriber: sinon.stub()
        };
        sinon.stub(Registry, 'the').returns({
            ensureService: sinon.stub().returns(serviceStub),
            service: sinon.stub().returns(serviceStub)
        });
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('postNotify', () => {
        it('should add a notify subscriber and send status 200', () => {
            postNotify('type1', req, res);
            expect(serviceStub.addNotifySubscriber.calledWith('subscriber1', 'type1', '/broadcastPath')).to.be.true;
            expect(res.sendStatus.calledWith(200)).to.be.true;
        });
    });

    describe('deleteNotify', () => {
        it('should remove a notify subscriber and send status 200', () => {
            serviceStub.removeNotifySubscriber.returns(true);
            deleteNotify('type1', req, res);
            expect(serviceStub.removeNotifySubscriber.calledWith('subscriber1', 'type1', '/broadcastPath')).to.be.true;
            expect(res.sendStatus.calledWith(200)).to.be.true;
        });

        it('should return 404 if service is not found', () => {
            Registry.the().service.returns(null);
            deleteNotify('type1', req, res);
            expect(res.status.calledWith(404)).to.be.true;
            expect(res.end.calledWith("Unknown service 'service1'\n")).to.be.true;
        });

        it('should return 404 if notifier is not found', () => {
            serviceStub.removeNotifySubscriber.returns(false);
            deleteNotify('type1', req, res);
            expect(res.status.calledWith(404)).to.be.true;
            expect(res.end.calledWith("Unknown notifier 'subscriber1/type1: /broadcastPath' on service 'service1'\n")).to.be.true;
        });
    });
});