import { expect } from 'chai';
import {
  connectAndInitDatabase,
  clientWithTransaction,
  pool,
} from '../index.js';

describe('Database Utility Functions - Integration Tests', function () {
  this.timeout(10000);

  const DB_CONFIG = {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT ? Number(process.env.POSTGRES_PORT) : 5432,
    user: process.env.POSTGRES_USER || 'trinocular_db_user',
    password: process.env.POSTGRES_SECRET || 'postgres_secret',
    defaultDatabase: process.env.POSTGRES_DEFAULT_DB || 'trinocular_db',
    database: process.env.POSTGRES_DB || 'trinocular_test_db',
  };

  before(async () => {
    // Ensure database is created and schema is initialized
    await connectAndInitDatabase({
      ...DB_CONFIG,
      initScriptFile: null, // Skip script for now, unless you have one to test
    });
  });

  it('should create the database when defaultDatabase differs', async () => {
    const testDbName = 'test_db_' + Date.now();
    const config = { ...DB_CONFIG, database: testDbName };

    await connectAndInitDatabase({ ...config, initScriptFile: null });

    const client = await pool.connect();

    const dbListResult = await client.query('SELECT datname FROM pg_database');
    await client.end();

    const databases = dbListResult.rows.map((r) => r.datname);
    expect(databases).to.include(testDbName);
  });

  it('should execute the initialization script if provided', async () => {
    const initScriptFile = './tests/test_schema.sql';

    await connectAndInitDatabase({ ...DB_CONFIG, initScriptFile: initScriptFile });

    const client = await pool.connect();

    const tableCheck = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name = 'test_init_script'
    `);

    await client.end();
    expect(tableCheck.rowCount).to.equal(1);
  });

  it('should correctly handle transactions (commit and rollback)', async () => {
    await clientWithTransaction(async (client) => {
      await client.query('CREATE TABLE IF NOT EXISTS test_tx (id SERIAL PRIMARY KEY, value TEXT);');
    });

    const insertedValue = 'committed_value';

    await clientWithTransaction(async (client) => {
      await client.query('INSERT INTO test_tx (value) VALUES ($1);', [insertedValue]);
    });

    const client = await pool.connect();

    const result = await client.query('SELECT value FROM test_tx');
    expect(result.rows.map((r) => r.value)).to.include(insertedValue);

    await client.end();
  });

  it('should rollback on transaction failure', async () => {
    await clientWithTransaction(async (client) => {
      await client.query('CREATE TABLE IF NOT EXISTS test_rollback (id SERIAL PRIMARY KEY, value TEXT);');
    });

    try {
      await clientWithTransaction(async (client) => {
        await client.query('INSERT INTO test_rollback (value) VALUES ($1);', ['rollback_value']);
        throw new Error('transaction failed');
      });
    } catch (err) {
      expect(err.message).to.equal('transaction failed');
    }

    const client = await pool.connect();

    const result = await client.query('SELECT * FROM test_rollback');
    expect(result.rowCount).to.equal(0); // Nothing should have been committed

    await client.end();
  });
});
