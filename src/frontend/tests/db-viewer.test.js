import sinon from 'sinon';
import { expect } from 'chai';
import {dbViewer} from '../routes/db-viewer.js';
import {dumpAllTables} from "../lib/database.js";

describe('DB-Viewer Route', () => {
    let req, res, envStub, dbStub;

    beforeEach(() => {
        req = {
            method: 'GET',
            path: '/'
        };
        res = {
            sendStatus: sinon.stub(),
        }
        envStub = sinon.stub(process, 'env').get(() => ({
            ...process.env
        }))
    })

    afterEach(() => {
        sinon.restore();
    })

    describe('db-viewer', () => {
        it('should send status 404 when environment flag is not set', async () => {
            envStub.value({...process.env, ENABLE_DB_VIEWER: false});
            await dbViewer(req,res);
            expect(res.sendStatus.calledWith(404)).to.be.true;
        });

        it('should send status 200 when environment flag is set',  async () => {
            envStub.value({...process.env, ENABLE_DB_VIEWER: true});
            await dbViewer(req,res);
            expect(res.sendStatus.calledWith(200)).to.be.true;
        });
    })
})