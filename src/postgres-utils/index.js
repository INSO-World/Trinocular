import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

export { pg };

const { Pool, Client } = pg;

async function createUserDatabase(options) {
  console.log(`Connecting to default database '${options.defaultDatabase}'`);

  // Create a temporary client with the default database
  const client = new Client({
    host: options.host,
    port: options.port,
    user: options.user,
    password: options.password,
    database: options.defaultDatabase
  });

  await client.connect();

  try {
    // Table and database identifiers are not allowed as prepared parameters
    const escapedDatabase = client.escapeIdentifier(options.database);
    await client.query(`CREATE DATABASE ${escapedDatabase}`);

    console.log(`Database '${options.database}' created`);
  } catch (e) {
    // Database already exists error is fine
    if (e.code === '42P04') {
      console.log(`Database '${options.database}' already exists`);
    } else {
      console.error(`Could not create database '${options.database}':`, e);
      throw e;
    }
  } finally {
    await client.end();
  }
}

async function runInitScript(initScriptFile) {
  initScriptFile = path.resolve(initScriptFile);
  console.log(`Running database init script: '${initScriptFile}'`);

  const initScript = fs.readFileSync(initScriptFile, 'utf-8');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(initScript);
    await client.query('COMMIT');
  } catch (e) {
    console.log('Could not run database init script. Rolling back...', e);

    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export let pool = null;

export async function connectAndInitDatabase(options) {
  // Use the provided default database to create a connection and then create the
  // actual database if it does not exist yet
  if (options.defaultDatabase && options.defaultDatabase !== options.database) {
    await createUserDatabase(options);
  }

  pool = new Pool({
    host: options.host,
    port: options.port,
    user: options.user,
    password: options.password,
    database: options.database,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
  });

  // Load and run the init script in the pool
  if (options.initScriptFile) {
    await runInitScript(options.initScriptFile);
  }
}

/**
 * @template T
 * @param {T[]} records
 * @param {function(any[], T, number):void} appenderFunction
 * @param {any[]} parameters
 * @returns
 */
export function formatInsertManyValues(records, appenderFunction, parameters = []) {
  let valuesString = '';
  let ctr = 0;

  for (const record of records) {
    const previousLength = parameters.length;
    appenderFunction(parameters, record, ctr++);

    if (parameters.length === previousLength) {
      continue;
    }

    if (valuesString.length) {
      valuesString += ',';
    }

    valuesString += '(';

    for (let i = previousLength; i < parameters.length; i++) {
      if (i > previousLength) {
        valuesString += ',';
      }

      valuesString += '$' + (i + 1);
    }

    valuesString += ')';
  }

  return {
    valuesString,
    parameters
  };
}

/**
 * @template T
 * @param {function(pg.PoolClient):Promise<T>} transactionFunction
 * @returns {T}
 */
export async function clientWithTransaction(transactionFunction) {
  const client = await pool.connect();

  let result = null;

  try {
    await client.query('BEGIN');

    result = await transactionFunction(client);

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }

  return result;
}
