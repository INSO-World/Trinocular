import {expect} from 'chai';
import supertest from 'supertest';

import {pool, connectAndInitDatabase} from '../../../src/postgres-utils/index.js';

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
  const archiveGitlabRepoURL = 'https://reset.inso-world.com/repo/archive/23ws-ase-pr-qse-05';
  const archiveGitlabAPIToken = 'glpat-CsxRosLm-Bskuax3ryMw';

  const repoUUID = "deadbeef-cafe-babe-f00d-feedface0000";

  const internalAPIToken = 'internalAPItoken';

  const apiBridgeBaseUrl = 'http://localhost:8084';

  const endpointNames = ['members'];

  const definedMembers = [
    { id: 1177, username: '12023172', name: 'Christoph Neubauer', has_spent_time: false},
    { id: 1178, username: '12022484', name: 'Philipp Vanek', has_spent_time: false},
    { id: 1179, username: '12020638', name: 'Matthias Preymann', has_spent_time: false},
    { id: 1181, username: '12023147', name: 'Oliver Mayer', has_spent_time: false},
    { id: 1188, username: '12019868', name: 'Michael Trauner', has_spent_time: false},
    { id: 520, username: '11904671', name: 'Philipp Eichinger', has_spent_time: true},
    { id: 1109, username: '11911069', name: 'Lukas Fink', has_spent_time: true},
    { id: 429, username: '11905177', name: 'Alexander Keusch', has_spent_time: true},
    { id: 1402, username: '12208176', name: 'Adam Skuta', has_spent_time: true},
    { id: 1936, username: '11709668', name: 'Vlad Popescu-Vifor', has_spent_time: true},
    { id: 1077, username: '01246408', name: 'Maximilian Grohmann', has_spent_time: true},
  ];

  async function addRepository(repoUUID, name, type, url, authToken) {
    const endpoint = '/repository';

    const body = {
      "name": name,
      "uuid": repoUUID,
      "type": type,
      "url": archiveGitlabRepoURL,
      "authToken": archiveGitlabAPIToken
    };

    const response = await supertest(apiBridgeBaseUrl)
      .post(endpoint)
      .send(body)
      .set('Accept', 'application/json')
      .set('Authorization', `bearer ${internalAPIToken}`);

    expect(response.status).to.equal(200);

    const queryResult = await pool.query(
      `SELECT *
         FROM repository
         WHERE uuid = $1`,
      [body.uuid]
    );

    expect(queryResult.rowCount).to.equal(1);
    const dbEntry = queryResult.rows[0];
    expect(dbEntry.name).to.equal(body.name);
    expect(dbEntry.uuid).to.equal(body.uuid);
    expect(dbEntry.type).to.equal(body.type);
    expect(dbEntry.url).to.equal(body.url);
    expect(dbEntry.auth_token).to.equal(body.authToken);

    return dbEntry.id;
  }

  async function deleteRepository(repoUUID) {
    const endpoint = '/repository';
    const response = await supertest(apiBridgeBaseUrl)
      .delete(`${endpoint}/${repoUUID}`)
      .set('Accept', 'application/json')
      .set('Authorization', `bearer ${internalAPIToken}`);

    expect(response.status).to.equal(200, 'Failed to delete repository: Unexpected status code');
  }

  async function insertMembers(members) {
    const insertQuery = `
    INSERT INTO dyn_members (id, username, name, has_spent_time, repository_id)
    VALUES ($1, $2, $3, $4, $5);
  `;

    for (const member of members) {
      await pool.query(insertQuery, [
        member.id,
        member.username,
        member.name,
        member.has_spent_time,
        member.repository_id
      ]);
    }
  }

  describe('Database Connection Test', function () {
    it('should successfully connect to the database and run a simple query', async function () {
      const result = await pool.query('SELECT 1 + 1 AS result');
      console.log('Query result:', result.rows[0].result);

      expect(result.rows[0].result).to.equal(2);
    });
  });

  describe('Initialization', function () {
    it('should exist table dyn_members as specified', async () => {

      const expectedSchema = {
        id: {data_type: 'integer', is_nullable: 'NO'},
        username: {data_type: 'character varying', is_nullable: 'NO', max_length: 100},
        name: {data_type: 'character varying', is_nullable: 'YES', max_length: 100},
        email: {data_type: 'character varying', is_nullable: 'YES', max_length: 100},
        has_spent_time: {data_type: 'boolean', is_nullable: 'YES'},
        repository_id: {data_type: 'integer', is_nullable: 'NO'},
      };

      // Query the table schema
      const result = await pool.query(`
        SELECT column_name, data_type, is_nullable, character_maximum_length
        FROM information_schema.columns
        WHERE table_name = 'dyn_members'
          AND table_schema = 'public';
      `);

      const actualSchema = result.rows.reduce((schema, column) => {
        schema[column.column_name] = {
          data_type: column.data_type,
          is_nullable: column.is_nullable,
          max_length: column.character_maximum_length || null,
        };
        return schema;
      }, {});

      // Compare actual schema with expected schema
      for (const column in expectedSchema) {
        expect(actualSchema).to.have.property(column);
        expect(actualSchema[column].data_type).to.equal(expectedSchema[column].data_type);
        expect(actualSchema[column].is_nullable).to.equal(expectedSchema[column].is_nullable);
        expect(actualSchema[column].max_length).to.equal(expectedSchema[column].max_length || null);
      }

      // Ensure no unexpected columns
      expect(Object.keys(actualSchema)).to.have.length(Object.keys(expectedSchema).length);
    });
  });

  describe('POST /repository', () => {
    // TODO move to other test file 'api-bridge.test.js'

    after(async () => {
      await deleteRepository(repoUUID)
    });

    it('should update the members for the given repository', async () => {
      await addRepository(repoUUID, 'ArchiveGitLabRepo', 'gitlab', archiveGitlabRepoURL, archiveGitlabAPIToken);
    });
  });

  describe('POST /snapshot/:uuid', () => {
    const endpoint = `/snapshot/${repoUUID}`;
    let insertedRepoId;
    let expectedMembers;

    before(async () => {
      insertedRepoId = await addRepository(repoUUID, 'ArchiveGitLabRepo', 'gitlab', archiveGitlabRepoURL, archiveGitlabAPIToken);
      expectedMembers = definedMembers.map(member => ({
        ...member,
        repository_id: insertedRepoId
      }));
    });

    after(async () => {
      await deleteRepository(repoUUID);
    });

    it('should update the members of the defined repository', async () => {
      const response = await supertest(apiBridgeBaseUrl)
        .post(endpoint)
        .set('Accept', 'application/json')
        .set('Authorization', `bearer ${internalAPIToken}`);

      expect(response.status).to.equal(200);

      // FIXME Snapshot takes time to complete, hence we need to wait, but it often does not work
      // await new Promise(resolve => setTimeout(resolve, 8000));

      const result = await pool.query(
        'SELECT id, username, name, has_spent_time, repository_id FROM dyn_members WHERE repository_id = $1',
        [insertedRepoId]);

      expect(result.rows).to.have.lengthOf(expectedMembers.length);

      expectedMembers.forEach((expectedMember) => {
        const row = result.rows.find((r) => r.id === expectedMember.id);
        expect(row).to.exist;
        expect(row).to.include(expectedMember);
      });
    });
  });

  describe('GET - Endpoints', async () => {
    let insertedRepoId;
    let expectedMembers;

    before(async () => {
      insertedRepoId = await addRepository(repoUUID, 'ArchiveGitLabRepo', 'gitlab', archiveGitlabRepoURL, archiveGitlabAPIToken);
      expectedMembers = definedMembers.map(member => ({
        ...member,
        repository_id: insertedRepoId
      }));
      await insertMembers(expectedMembers);
    });

    after(async () => {
      await deleteRepository(repoUUID);
    });

    it('all get endpoints with the various endpoint names should exist', async () => {
      const requests = endpointNames.map(async endpointName => {
        const endpoint = `/bridge/${repoUUID}/${endpointName}`;
        const response = await supertest(apiBridgeBaseUrl)
          .get(endpoint)
          .set('Accept', 'application/json')
          .set('Authorization', `bearer ${internalAPIToken}`);

        expect(response.status).to.equal(200);
      });

      await Promise.all(requests);
    });

    describe('GET /bridge/:uuid/members', () => {
      it('should return the members for the given repository', async () => {
        const endpoint = `/bridge/${repoUUID}/members`;
        const response = await supertest(apiBridgeBaseUrl)
          .get(endpoint)
          .set('Accept', 'application/json')
          .set('Authorization', `bearer ${internalAPIToken}`);

        expect(response.status).to.equal(200);

        const responseMembers = response.body;
        expect(responseMembers).to.have.lengthOf(expectedMembers.length);

        expectedMembers.forEach((expectedMember) => {
          const member = responseMembers.find((m) => m.id === expectedMember.id);
          expect(member).to.exist;
          expect(member).to.include(expectedMember);
        });
      });
    });

    describe('GET /bridge/:uuid/members/:id', () => {
      it('should return the member with the given id for the given repository', async () => {
        const endpoint = `/bridge/${repoUUID}/members/${expectedMembers[0].id}`;
        const response = await supertest(apiBridgeBaseUrl)
          .get(endpoint)
          .set('Accept', 'application/json')
          .set('Authorization', `bearer ${internalAPIToken}`);

        expect(response.status).to.equal(200);

        const responseMember = response.body;
        expect(responseMember).to.include(expectedMembers[0]);
      });
    });
  });

  describe('DELETE /repository/:uuid', () => {
    before(async () => {
      await addRepository(repoUUID, 'ArchiveGitLabRepo', 'gitlab', archiveGitlabRepoURL, archiveGitlabAPIToken);
    });

    it('should delete the repository with the given uuid', async () => {
      await deleteRepository(repoUUID);

      const queryResult = await pool.query(
        `SELECT *
         FROM repository
         WHERE uuid = $1`,
        [repoUUID]
      );

      expect(queryResult.rowCount).to.equal(0);
    });
  });

  describe('PUT /repository', () => {
    before(async () => {
      await addRepository(repoUUID, 'ArchiveGitLabRepo', 'gitlab', archiveGitlabRepoURL, archiveGitlabAPIToken);
    });

    after(async () => {
      await deleteRepository(repoUUID);
    });

    it('should update the repository with the given uuid', async () => {
      const endpoint = `/repository/${repoUUID}`;

      const body = {
        "name": "EditedArchiveGitLabRepo",
        "uuid": repoUUID,
        "type": "gitlab",
        "url": archiveGitlabRepoURL,
        "authToken": archiveGitlabAPIToken
      };

      const response = await supertest(apiBridgeBaseUrl)
        .put(endpoint)
        .send(body)
        .set('Accept', 'application/json')
        .set('Authorization', `bearer ${internalAPIToken}`);

      expect(response.status).to.equal(200);

      const queryResult = await pool.query(
        `SELECT *
         FROM repository
         WHERE uuid = $1`,
        [body.uuid]
      );

      expect(queryResult.rowCount).to.equal(1);
      const dbEntry = queryResult.rows[0];
      expect(dbEntry.name).to.equal(body.name);
      expect(dbEntry.uuid).to.equal(body.uuid);
      expect(dbEntry.type).to.equal(body.type);
      expect(dbEntry.url).to.equal(body.url);
      expect(dbEntry.auth_token).to.equal(body.authToken);
    });
  });
});
