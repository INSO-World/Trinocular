import { expect } from 'chai';
import {pool, connectAndInitDatabase} from '../../postgres-utils/index.js';
import {getRepository} from "../lib/database.js";

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

  console.log('Host:', pool.getHost());
  console.log('Port:', pool.getPort());
  console.log('User:', pool.getUsername());
  console.log('Password:', pool.getPassword());
  console.log('Database:', pool.getDatabase());

  console.log('Pool has been initialized successfully.');
});

after(async () => {
  await pool.end();
});

describe('Database Connection Test', function () {
  it('should successfully connect to the database and run a simple query', async function () {
    const result = await pool.query('SELECT 1 + 1 AS result');
    console.log('Query result:', result.rows[0].result);

    // Assert that the query returned the expected result
    expect(result.rows[0].result).to.equal(2);
  });
});

// describe('getRepository', () => {
//   beforeEach(async () => {
//     await pool.query('TRUNCATE TABLE repository RESTART IDENTITY');
//   });
//
//   it('should return a repository when it exists in the database', async () => {
//     const mockRepository = {
//       name: 'Test Repo',
//       uuid: '123e4567-e89b-12d3-a456-426614174000',
//       type: 'git',
//       url: 'https://example.com/test-repo',
//       authToken: 'abcd1234'
//     };
//
//     await pool.query(
//       'INSERT INTO repository (name, uuid, type, url, auth_token) VALUES ($1, $2, $3, $4, $5)',
//       [mockRepository.name, mockRepository.uuid, mockRepository.type, mockRepository.url, mockRepository.authToken]
//     );
//
//     const repository = await getRepository(mockRepository.uuid);
//
//     expect(repository).to.not.be.null;
//     expect(repository.name).to.equal(mockRepository.name);
//     expect(repository.uuid).to.equal(mockRepository.uuid);
//     expect(repository.type).to.equal(mockRepository.type);
//     expect(repository.url).to.equal(mockRepository.url);
//     expect(repository.authToken).to.equal(mockRepository.authToken);
//   });
//
//   it('should return null if no repository exists with the given uuid', async () => {
//     const repository = await getRepository('non-existent-uuid');
//     expect(repository).to.be.null;
//   });
// });
