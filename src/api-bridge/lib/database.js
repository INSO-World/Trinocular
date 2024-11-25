import { formatInsertManyValues, pool, pg } from '../../postgres-utils/index.js';
import { Repository } from './repository.js';

function assertDynamicTable(name) {
  if (!name.startsWith('dyn_')) {
    throw Error(`Dynamic tables must be prefixed with 'dyn_'. (Provided table name '${name}')`);
  }
}

/**
 * Creates a dynamic table if it not exists yet, else does nothing
 * @param {string} name Name of the dynamic table. It must be prefixed with 'dyn_'.
 * @param {Object.<string, string>} columns Columns and their types as key-value-pairs
 */
export async function createTableIfNotExists(name, columns, options = {}) {
  assertDynamicTable(name);
  const escapedName = pg.escapeIdentifier(name);

  // Make comma separated list of column name and type
  let columnsString = '';
  for (const name in columns) {
    columnsString += `${name} ${columns[name]},`;
  }

  // Take of the trailing comma
  columnsString = columnsString.substring(0, columnsString.length - 1);

  let constraintsString = '';
  if (Array.isArray(options.compositePrimaryKey)) {
    const keyColumnsString = options.compositePrimaryKey
      .map(key => pg.escapeIdentifier(key))
      .join(',');
    constraintsString += `, PRIMARY KEY (${keyColumnsString})`;
  }

  await pool.query(
    `CREATE TABLE IF NOT EXISTS ${escapedName} (${columnsString} ${constraintsString})`
  );
}

/**
 * @param {string} uuid
 * @returns {Repository?}
 */
export async function getRepository(uuid) {
  const result = await pool.query('SELECT * FROM repository WHERE uuid = $1', [uuid]);

  if (!result.rows.length) {
    return null;
  }

  const { name, id, type, auth_token, url } = results.rows[0];
  return new Repository(name, uuid, id, type, auth_token, url);
}

/**
 * @param {Repository[]} repositories
 */
export async function insertRepositoriesAndSetDbId(repositories) {
  const { valuesString, parameters } = formatInsertManyValues(repositories, (parameters, repo) => {
    parameters.push(repo.name, repo.uuid, repo.type, repo.authToken, repo.url);
  });

  const result = await pool.query(
    `INSERT INTO repository(name, uuid, type, auth_token, url) VALUES ${valuesString} RETURNING id`,
    parameters
  );

  if (!result.rows || result.rows.length < repositories.length) {
    throw Error('Expected record IDs after insertion');
  }

  repositories.forEach((repo, idx) => (repo.dbId = result.rows[idx].id));
}

/**
 * Deletes all records from a dynamic table
 * @param {string} name Name of the dynamic table
 * @returns {number} Number of deleted records
 */
export async function clearTable(name) {
  assertDynamicTable(name);
  const escapedName = pg.escapeIdentifier(name);

  const result = await pool.query(`DELETE FROM ${escapedName}`);

  return result.rowCount;
}

/**
 * Deletes all records from a dynamic table that reference a repository by db ID
 * @param {string} name Name of the dynamic table
 * @param {number} repoDbId DB ID of the repository
 * @returns {number} Number of deleted records
 */
export async function clearRepositoryRecordsFromTable(name, repoDbId) {
  assertDynamicTable(name);
  const escapedName = pg.escapeIdentifier(name);

  const result = await pool.query(`DELETE FROM ${escapedName} WHERE repository_id = $1`, [
    repoDbId
  ]);

  return result.rowCount;
}

/**
 * @returns {Repository[]}
 */
export async function loadAllRepositories() {
  const result = await pool.query('SELECT * FROM repository');

  const repositories = result.rows.map(
    ({ name, uuid, id, type, auth_token, url }) =>
      new Repository(name, uuid, id, type, auth_token, url)
  );

  return repositories;
}

/**
 * @param {Repository} repo
 */
export async function insertRepositoryAndSetDbId(repo) {
  const result = await pool.query(
    'INSERT INTO repository (name, uuid, type, auth_token, url) VALUES($1, $2, $3, $4, $5) RETURNING id',
    [repo.name, repo.uuid, repo.type, repo.authToken, repo.url]
  );

  if (!result.rows || result.rows.length < 1) {
    throw Error('Expected record ID after insertion');
  }

  repo.dbId = result.rows[0].id;
}

/**
 * @param {string} uuid
 */
export async function removeRepositoryByUuid(uuid) {
  await pool.query('DELETE FROM repository WHERE uuid = $1', [uuid]);
}

/**
 * @param {Repository} repo
 */
export async function updateRepository(repo) {
  await pool.query(
    'UPDATE repository SET name = $1, type = $2, auth_token = $3, url = $4 WHERE id = $5',
    [repo.name, repo.type, repo.authToken, repo.url, repo.dbId]
  );
}

/**
 * @param {string} name Table name (must be dynamic)
 * @param {Object.<string, string|number>[]} records Array of records
 */
export async function insertRecordsIntoTable(name, records) {
  assertDynamicTable(name);
  const escapedName = pg.escapeIdentifier(name);

  if (!records.length) {
    return;
  }

  // Assume that all records have the same columns, so just look at the first one
  const columnNames = Object.keys(records[0]);
  const columnsString = columnNames.map(columnName => pg.escapeIdentifier(columnName)).join(',');

  const { valuesString, parameters } = formatInsertManyValues(records, (parameters, record) => {
    columnNames.forEach(columnName => parameters.push(record[columnName]));
  });

  await pool.query(
    `INSERT INTO ${escapedName} (${columnsString}) VALUES ${valuesString}`,
    parameters
  );
}

export async function getRecordFromTableById(name, repositoryDbId, id) {
  assertDynamicTable(name);
  const escapedName = pg.escapeIdentifier(name);

  const result = await pool.query(
    `SELECT * FROM ${escapedName} WHERE repository_id = $1 AND id = $2`,
    [repositoryDbId, id]
  );

  return result.rows[0] || null;
}

export async function getRecordsFromTable(name, repositoryDbId) {
  assertDynamicTable(name);
  const escapedName = pg.escapeIdentifier(name);

  const result = await pool.query(`SELECT * FROM ${escapedName} WHERE repository_id = $1`, [
    repositoryDbId
  ]);

  return result.rows;
}
