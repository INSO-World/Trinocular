import {expect} from 'chai';
import {pool, connectAndInitDatabase} from '../../postgres-utils/index.js';
import {getRepository} from "../lib/database.js";
import {describe} from "mocha/lib/cli/run.js";

before(async function () {
  this.timeout(30000);

  await connectAndInitDatabase({
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_SECRET,
    database: process.env.POSTGRES_DB,
    defaultDatabase: process.env.POSTGRES_DEFAULT_DB,
    initScriptFile: process.env.POSTGRES_INIT_SCRIPT
  });

  console.log('Pool has been initialized successfully.');
});

after(async () => {
  await pool.end();
});

describe('Members', () => {
  const endpointNames = ['members'];

  const tableSchema = {
    id: 'INTEGER NOT NULL',
    username: 'VARCHAR(100) NOT NULL',
    name: 'VARCHAR(100)',
    email: 'VARCHAR(100)'
  }

  beforeEach(async () => {
    // TODO: insert example members and one or two exemplary repo
  });

  describe('Database Connection Test', function () {
    it('should successfully connect to the database and run a simple query', async function () {
      const result = await pool.query('SELECT 1 + 1 AS result');
      console.log('Query result:', result.rows[0].result);

      expect(result.rows[0].result).to.equal(2);
    });
  });

  describe('endpointNames()', () => {
    // Expect the returned list to equal the defined endpoint Names for the test
  });

  describe('onInit()', () => {
    // Before: drop all

    it('should create tables as specified', async () => {
      const repoUUID = '123e4567-e89b-12d3-a456-426614174000';

      // Check if table is created correctly

    });
  });

  describe('POST /snapshot/:uuid', () => {
    it('should update the members for the given repository', async () => {
      const repoUUID = '123e4567-e89b-12d3-a456-426614174000';

      // Define which member UPDATE is to be expected
      // They should be put into the database beforehand in the beforeEach

      // Send post request

      // Check if the members are UPDATED in the database
    });
  });

  describe('Endpoints', () => {
    // For each endpoint name check if
    // GET /bridge/:uuid/<endpointName>
    // GET /bridge/:uuid/<endpointName>/:id
    // exist
  });

  describe('GET /bridge/:uuid/members', () => {
    it('should return the members for the given repository', async () => {
      const repoUUID = '123e4567-e89b-12d3-a456-426614174000';

      // Define which members are to be expected
      // They should be put into the database beforehand in the beforeEach

      // Send get request

      //
      // Check if the members are contained in the list
    });
  });

  describe('GET /bridge/:uuid/members/:id', () => {
    it('should return the member with the given id for the given repository', async () => {
      const repoUUID = '123e4567-e89b-12d3-a456-426614174000';
      const memberID = '1';

      // Define which member is to be expected
      // They should be put into the database beforehand in the beforeEach

      // Send get request

      // Check if the member info is contained in the response
    });
  });
});
