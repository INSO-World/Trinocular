import sinon from 'sinon';
import esmock from 'esmock';
import { expect } from 'chai';

describe('DB-Viewer Route', () => {
  let req, res, envStub;
  let libDatabaseModuleStub;

  async function mockDbViewerImport() {
    // Load `dbViewer` and replace `dumpAllTables` using `esmock`
    return await esmock('../routes/db-viewer.js', {
      '../lib/database.js': libDatabaseModuleStub
    });
  }

  beforeEach(() => {
    console.log('Each');
    req = {
      method: 'GET'
    };
    res = {
      sendStatus: sinon.stub(),
      render: sinon.stub(),
      status: sinon.stub()
    };
    envStub = sinon.stub(process, 'env');

    libDatabaseModuleStub = { dumpAllTables: sinon.stub().returns('test') };
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('db-viewer', () => {
    console.log('Running db-viewer tests');
    it('should send status 404 when environment flag is not set', async () => {
      envStub.value({ ENABLE_DB_VIEWER: 'false' });
      const { dbViewer } = await mockDbViewerImport();
      await dbViewer(req, res);

      expect(res.sendStatus.calledWith(404)).to.be.true;
      expect(libDatabaseModuleStub.dumpAllTables.called).to.be.false;
    });

    it('should send status 200 when environment flag is set', async () => {
      envStub.value({ ENABLE_DB_VIEWER: 'true' });

      const { dbViewer } = await mockDbViewerImport();

      await dbViewer(req, res);

      expect(res.render.calledWith('db-viewer', { tables: 'test' })).to.be.true;
      expect(res.render.calledWith('db-viewer', { tables: {} })).to.be.false;
      expect(libDatabaseModuleStub.dumpAllTables.calledOnce).to.be.true;
    });
  });
});
