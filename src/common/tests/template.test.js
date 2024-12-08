import { expect } from 'chai';
import sinon from 'sinon';
import esmock from 'esmock';
import { templateString } from '../template.js';

describe('String Templating', () => {
  let nodeFsModuleStub;

  async function mockNodeFsImport() {
    return await esmock('../template.js', {
      'node:fs': nodeFsModuleStub
    });
  }

  beforeEach(() => {
    nodeFsModuleStub = {
      readFileSync: sinon.stub().returns('')
    };
  });

  describe('templateString', () => {
    it('leaves plain strings as is', () => {
      const input = 'A plain old string';
      const output = templateString(input);
      expect(output).to.equal(input);
    });

    it('ignores empty strings', () => {
      const input = '';
      const output = templateString(input);
      expect(output).to.equal(input);
    });

    it('ignores single and triple curlies', () => {
      const input = 'a string with {some text} and {{{and more text}}}';
      const output = templateString(input);
      expect(output).to.equal(input);
    });

    it('inserts values from array by index', () => {
      const input = 'a string with {{1}}, {{0}}, {{ 2 }}, {{  3  }}';
      const output = templateString(input, ['abc', 'def', 10, { a: 1 }]);
      expect(output).to.equal('a string with def, abc, 10, [object Object]');
    });

    it('inserts values from object by key', () => {
      const input = 'a string with {{a}}, {{b}}, {{ c }}, {{  d  }}';
      const output = templateString(input, { b: 'abc', a: 'def', c: 10, d: { a: 1 } });
      expect(output).to.equal('a string with def, abc, 10, [object Object]');
    });

    it('inserts values from map by key', () => {
      const map = new Map();
      map.set('b', 'abc');
      map.set('a', 'def');
      map.set('c', 10);
      map.set('d', { a: 1 });

      const input = 'a string with {{a}}, {{b}}, {{ c }}, {{  d  }}';
      const output = templateString(input, map);
      expect(output).to.equal('a string with def, abc, 10, [object Object]');
    });
  });

  describe('templateFile', () => {
    it('ignores empty file', async () => {
      const { templateFile } = await mockNodeFsImport();

      nodeFsModuleStub.readFileSync.returns('');

      const output = templateFile('/a/path/file.txt');

      expect(output).to.equal('');
      expect(nodeFsModuleStub.readFileSync.calledOnce).to.be.true;
      expect(nodeFsModuleStub.readFileSync.calledWith('/a/path/file.txt', 'utf-8')).to.be.true;
    });

    it('formats file', async () => {
      const { templateFile } = await mockNodeFsImport();

      nodeFsModuleStub.readFileSync.returns('a string with {{1}}, {{0}}');

      const output = templateFile('/a/path/file.txt', ['abc', 'def']);

      expect(output).to.equal('a string with def, abc');
      expect(nodeFsModuleStub.readFileSync.calledOnce).to.be.true;
      expect(nodeFsModuleStub.readFileSync.calledWith('/a/path/file.txt', 'utf-8')).to.be.true;
    });
  });
});
