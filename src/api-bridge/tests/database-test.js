import { expect } from 'chai';
import {pool, connectAndInitDatabase} from '../../postgres-utils/index.js';
import {getRepository} from "../lib/database.js";

import postgresTestcontainers from '@testcontainers/postgresql';
const { PostgreSqlContainer } = postgresTestcontainers;

let postgresContainer;

before(async function () {
  this.timeout(30000);
  postgresContainer = await new PostgreSqlContainer()
    .withDatabase('testdb')
    .withUsername('testuser')
    .withPassword('testpass')
    .start();

  console.log('PostgreSQL container started on port', postgresContainer.getMappedPort(5432));

  await connectAndInitDatabase({
    host: postgresContainer.getHost(),
    port: postgresContainer.getPort(),
    user: postgresContainer.getUsername(),
    password: postgresContainer.getPassword(),
    database: postgresContainer.getDatabase(),
    defaultDatabase: 'postgres',
    initScriptFile: './scripts/schema.sql'
  });

  console.log('Host:', postgresContainer.getHost());
  console.log('Port:', postgresContainer.getPort());
  console.log('User:', postgresContainer.getUsername());
  console.log('Password:', postgresContainer.getPassword());
  console.log('Database:', postgresContainer.getDatabase());

  console.log('Pool has been initialized successfully.');
});

after(async () => {
  await pool.end();
  await postgresContainer.stop();
});

describe('Database Connection Test', function () {
  it('should successfully connect to the database and run a simple query', async function () {
    const result = await pool.query('SELECT 1 + 1 AS result');
    console.log('Query result:', result.rows[0].result);

    // Assert that the query returned the expected result
    expect(result.rows[0].result).to.equal(2);
  });
});

describe('getRepository', () => {
  beforeEach(async () => {
    await pool.query('TRUNCATE TABLE repository RESTART IDENTITY');
  });

  it('should return a repository when it exists in the database', async () => {
    const mockRepository = {
      name: 'Test Repo',
      uuid: '123e4567-e89b-12d3-a456-426614174000',
      type: 'git',
      url: 'https://example.com/test-repo',
      authToken: 'abcd1234'
    };

    await pool.query(
      'INSERT INTO repository (name, uuid, type, url, auth_token) VALUES ($1, $2, $3, $4, $5)',
      [mockRepository.name, mockRepository.uuid, mockRepository.type, mockRepository.url, mockRepository.authToken]
    );

    const repository = await getRepository(mockRepository.uuid);

    expect(repository).to.not.be.null;
    expect(repository.name).to.equal(mockRepository.name);
    expect(repository.uuid).to.equal(mockRepository.uuid);
    expect(repository.type).to.equal(mockRepository.type);
    expect(repository.url).to.equal(mockRepository.url);
    expect(repository.authToken).to.equal(mockRepository.authToken);
  });

  it('should return null if no repository exists with the given uuid', async () => {
    const repository = await getRepository('non-existent-uuid');
    expect(repository).to.be.null;
  });
});
