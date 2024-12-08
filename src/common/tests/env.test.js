import { expect } from 'chai';
import sinon from 'sinon';
import esmock from 'esmock';

describe('readSecretEnv', () => {
  let nodeFsModuleStub;

  async function mockNodeFsImport() {
    return await esmock('../env.js', {
      'node:fs': nodeFsModuleStub
    });
  }

  beforeEach(() => {
    nodeFsModuleStub = {
      readFileSync: sinon.stub().returns('secret file contents\n')
    };
  });

  it('ignores regular variables', async () => {
    const { readSecretEnv } = await mockNodeFsImport();

    const initialEnv = {
      REGULAR_VAR: '10',
      A_SECRET_VAR: 'secret'
    };

    process.env = { ...initialEnv };

    readSecretEnv();

    expect(process.env).to.deep.equal(initialEnv);
    expect(nodeFsModuleStub.readFileSync.called).to.be.false;
  });

  it('loads secret variables from file', async () => {
    const { readSecretEnv } = await mockNodeFsImport();

    const initialEnv = {
      REGULAR_VAR: '10',
      A_SECRET_VAR: 'secret',
      A_SECRET_FILE: '/run/secrets/a/path/file.txt'
    };

    process.env = { ...initialEnv };

    readSecretEnv();

    expect(process.env).to.deep.equal({
      ...initialEnv,
      A_SECRET: 'secret file contents'
    });
    expect(nodeFsModuleStub.readFileSync.calledOnce).to.be.true;
    expect(nodeFsModuleStub.readFileSync.calledWith('/run/secrets/a/path/file.txt', 'utf-8')).to.be
      .true;
  });

  it('ignores secret variables with bad path', async () => {
    const { readSecretEnv } = await mockNodeFsImport();

    const initialEnv = {
      REGULAR_VAR: '10',
      A_SECRET_VAR: 'secret',
      A_SECRET_FILE: '/wrong/path/file.txt'
    };

    process.env = { ...initialEnv };

    readSecretEnv();

    expect(process.env).to.deep.equal(initialEnv);
    expect(nodeFsModuleStub.readFileSync.called).to.be.false;
  });
});
