import sinon from 'sinon';
import esmock from 'esmock';
import {expect} from 'chai';
import {dbViewer} from '../routes/db-viewer.js';
import {dumpAllTables} from "../lib/database.js";

describe('DB-Viewer Route', () => {
    let req, res, envStub, dumpAllTablesStub;

    beforeEach(async () => {
        req = {
            method: 'GET'
        };
        res = {
            sendStatus: sinon.stub(),
            status: sinon.stub()
        }
        envStub = sinon.stub(process, 'env').get(() => ({
            ...process.env
        }))

        dumpAllTablesStub = sinon.stub().resolves([]);

    })

    afterEach(() => {
        sinon.restore();
    })

    describe('db-viewer', () => {
        it('should send status 404 when environment flag is not set', async () => {
            envStub.value({ENABLE_DB_VIEWER: 'false'});
            await dbViewer(req, res);

            expect(res.sendStatus.calledWith(404)).to.be.true;
        });

        //TODO try mocking called functions another time
        /*
        it('should send status 200 when environment flag is set', async () => {
            envStub.value({ENABLE_DB_VIEWER: 'true'});

            const {dbViewerStub} = await esmock('../routes/db-viewer.js',
                {
                    '../routes/db-viewer.js': {
                        dumpAllTables: dumpAllTablesStub,
                        dbViewer: (req,res) => dbViewer(req,res)
                    }
                });
            //dumpAllTablesStub.returns([]);
            await dbViewerStub.dbViewer(req, res);
            expect(res.status.calledWith(200)).to.be.true;
        });
         */
    });
})
;