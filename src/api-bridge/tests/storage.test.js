import { expect } from 'chai';
import * as chai from 'chai';
import sinonChai from 'sinon-chai';
import sinon from 'sinon';
import esmock from 'esmock';
import chaiAsPromised from 'chai-as-promised';

chai.use(sinonChai);
chai.use(chaiAsPromised);

let Storage;
let createTableIfNotExistsStub;
let insertRecordsIntoTableStub;
let getRecordFromTableByIdStub;
let getRecordsFromTableStub;

describe('Storage', () => {
  beforeEach(async () => {
    createTableIfNotExistsStub = sinon.stub();
    insertRecordsIntoTableStub = sinon.stub();
    getRecordFromTableByIdStub = sinon.stub();
    getRecordsFromTableStub = sinon.stub();

    // Mock the database functions
    Storage = (
      await esmock('../lib/storage.js', {
        '../lib/database.js': {
          createTableIfNotExists: createTableIfNotExistsStub,
          insertRecordsIntoTable: insertRecordsIntoTableStub,
          getRecordFromTableById: getRecordFromTableByIdStub,
          getRecordsFromTable: getRecordsFromTableStub
        }
      })
    ).Storage;
  });

  afterEach(() => {
    sinon.restore();
    esmock.purge('../lib/storage.js');
  });

  describe('ensureTable', () => {
    it('should create a table with valid column definitions', async () => {
      const storage = new Storage('testEndpoint');
      const columns = {
        id: 'INTEGER NOT NULL',
        name: 'TEXT',
        description: 'TEXT'
      };

      await storage.ensureTable(columns);

      expect(createTableIfNotExistsStub).to.have.been.calledOnceWithExactly(
        'dyn_testEndpoint',
        {
          id: 'INTEGER NOT NULL',
          name: 'TEXT',
          description: 'TEXT',
          repository_id: 'INTEGER NOT NULL REFERENCES repository (id) ON DELETE CASCADE'
        },
        {
          compositePrimaryKey: ['id', 'repository_id']
        }
      );
    });

    it('should throw an error if column definitions are invalid', async () => {
      const storage = new Storage('testEndpoint');
      const columns = {
        id: 123,
        name: null
      };

      await expect(storage.ensureTable(columns)).to.be.rejectedWith(
        "Storage table declaration for endpoint 'testEndpoint' has invalid column definition"
      );
    });

    it('should throw an error if id column is missing', async () => {
      const storage = new Storage('testEndpoint');
      const columns = {
        name: 'TEXT',
        description: 'TEXT'
      };

      await expect(storage.ensureTable(columns)).to.be.rejectedWith(
        "Storage table declaration for endpoint 'testEndpoint' is missing an id column"
      );
    });

    it('should throw an error if id column name contains "key"', async () => {
      const storage = new Storage('testEndpoint');
      const columns = {
        id: 'PRIMARY KEY',
        name: 'TEXT'
      };

      await expect(storage.ensureTable(columns)).to.be.rejectedWith(
        "Storage table declaration for endpoint 'testEndpoint' has id column declared as key"
      );
    });

    it('should throw an error if repository_id column is defined', async () => {
      const storage = new Storage('testEndpoint');
      const columns = {
        id: 'INTEGER NOT NULL',
        repository_id: 'TEXT'
      };

      await expect(storage.ensureTable(columns)).to.be.rejectedWith(
        "Storage table declaration for endpoint 'testEndpoint' uses reserved column name 'repository_id'"
      );
    });
  });

  describe('insertRecords', () => {
    it('should add repository_id to all records and call insertRecordsIntoTable', async () => {
      const storage = new Storage('testEndpoint');
      const repo = { dbId: 42 };
      const records = [{ name: 'record1' }, { name: 'record2' }];

      await storage.insertRecords(repo, records);

      const expectedRecords = [
        { name: 'record1', repository_id: 42 },
        { name: 'record2', repository_id: 42 }
      ];

      expect(insertRecordsIntoTableStub).to.have.been.calledOnceWithExactly(
        'dyn_testEndpoint',
        expectedRecords
      );
    });
  });

  describe('getRecordById', () => {
    it('should call getRecordFromTableById with the correct parameters', async () => {
      const storage = new Storage('testEndpoint');
      const repo = { dbId: 42 };
      const recordId = '123';

      getRecordFromTableByIdStub.resolves({ id: recordId, name: 'record1' });

      const result = await storage.getRecordById(repo, recordId);

      expect(getRecordFromTableByIdStub).to.have.been.calledOnceWithExactly(
        'dyn_testEndpoint',
        42,
        '123'
      );

      expect(result).to.deep.equal({ id: '123', name: 'record1' });
    });
  });

  describe('getAllRecords', () => {
    it('should call getRecordsFromTable with the correct parameters', async () => {
      const storage = new Storage('testEndpoint');
      const repo = { dbId: 42 };

      getRecordsFromTableStub.resolves([
        { id: '1', name: 'record1' },
        { id: '2', name: 'record2' }
      ]);

      const result = await storage.getAllRecords(repo);

      expect(getRecordsFromTableStub).to.have.been.calledOnceWithExactly('dyn_testEndpoint', 42);

      expect(result).to.deep.equal([
        { id: '1', name: 'record1' },
        { id: '2', name: 'record2' }
      ]);
    });
  });
});
