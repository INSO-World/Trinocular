import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';


/**
 * @typedef {import('./repo-settings.js').RepositorySettings} RepositorySettings
 */

export let database = null;

export function initDatabase(dbFile, initScriptFile) {
  if (database) {
    throw Error(`SQLite Database already initialized`);
  }

  database = new Database(dbFile /*, {verbose: console.log}*/);
  database.pragma('journal_mode = WAL');

  if (initScriptFile) {
    initScriptFile = path.resolve(initScriptFile);
    console.log(`Running database init script: '${initScriptFile}'`);

    const initScript = fs.readFileSync(initScriptFile, 'utf-8');

    database.transaction(() => {
      database.exec(initScript);
    })();
  }
}

// statement is generated once, reused every time the function is called
let ensureRepositoryStatement;
/**
 *
 * @param {string} name
 * @param {string} uuid
 */
export async function addNewRepository(name, uuid) {
  if (!ensureRepositoryStatement) {
    //automatically set the repository to active
    ensureRepositoryStatement = database.prepare(
      `INSERT INTO repository(name,uuid,is_active) VALUES (?, ?, 1)`
    );
  }
  const info = await ensureRepositoryStatement.run(name, uuid);

  if (info.changes > 0) {
    console.log('Inserted new repository:' + name);
  }
}

// statement is generated once, reused every time the function is called
let ensureUserStatement;

/**
 *  adds the user with userUuid to the frontend database, if it is not already in there
 */
export async function ensureUser(userUuid) {
  if (!ensureUserStatement) {
    ensureUserStatement = database.prepare(
      `INSERT INTO user (uuid) SELECT ? WHERE NOT EXISTS (SELECT 1 FROM user WHERE uuid = ?)`
    );
  }

  const info = await ensureUserStatement.run(userUuid, userUuid);

  if (info.changes > 0) {
    console.log(`Inserted new user UUID '${userUuid}'`);
  }
}

let getAllTablesStatement;
export function dumpAllTables(limit = 100) {
  if (!getAllTablesStatement) {
    getAllTablesStatement = database.prepare(
      `SELECT name FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%'`
    );
  }

  // Get the name of all tables and views
  const tableNames = getAllTablesStatement.pluck().all();

  // Select data and column names from each table
  const tables = [];
  for (const name of tableNames) {
    try {
      // SQLite does not allow table names to be a prepared parameter
      const dumpTableStatement = database.prepare(`SELECT * FROM ${name} LIMIT ${limit}`).raw(true);
      const rows = dumpTableStatement.all();
      const columns = dumpTableStatement.columns();

      tables.push({ name, rows, columns });
    } catch (e) {
      console.error(`Could not dump table '${name}'`, e);
    }
  }

  return tables;
}

let getUserRepoListStatement;
export function getUserRepoList(userUuid) {
  // Get from the db all repos and add user settings if they exist
  if (!getUserRepoListStatement) {
    getUserRepoListStatement = database.prepare(`
          SELECT
            r.uuid AS uuid,
            r.name AS name,
            r.is_active,
            s.color,
            s.is_favorite
          FROM
            repository r
          LEFT JOIN (
            SELECT rs.* FROM
              user u
            JOIN
              repository_settings rs ON rs.user_id = u.id
            WHERE 
              u.uuid = ?
          ) s ON r.id = s.repo_id
        `);
  }

  return getUserRepoListStatement.all(userUuid);
}

let setRepoSettingsStatement;
/**
 * @param {RepositorySettings} repoSettings
 */
export function setRepoSettings(repoSettings) {
  if (!setRepoSettingsStatement) {
    setRepoSettingsStatement = database.prepare(`
      UPDATE repository SET name = ?, is_active = ? WHERE uuid = ?
    `);
  }
  setRepoSettingsStatement.run(repoSettings.name, repoSettings.isActive ? 1 : 0, repoSettings.uuid);
}

let setUserRepoSettingsStatement;
/**
 * @param {string} userUuid
 * @param {RepositorySettings} repoSettings
 */
export function setUserRepoSettings(userUuid, repoSettings) {
  if (!setUserRepoSettingsStatement) {
    // We either try to update the existing record or create a new one. To make
    // this work, we need to first get the ID of the old one. If the ID is null
    // a new record is inserted.
    setUserRepoSettingsStatement = database.prepare(`
      INSERT OR REPLACE INTO
        repository_settings (id, user_id, repo_id, color, is_favorite)
      VALUES (
        (SELECT rs.id FROM
          repository_settings rs
        JOIN
          user u ON rs.user_id = u.id
        JOIN
          repository r ON rs.repo_id = r.id
        WHERE
          u.uuid = ? AND r.uuid= ?
        ),
        (SELECT id from user WHERE uuid = ?),
        (SELECT id from repository WHERE uuid = ?),
        ?, ?
    )`);
  }

  const info = setUserRepoSettingsStatement.run(
    userUuid,
    repoSettings.uuid,
    userUuid,
    repoSettings.uuid,
    repoSettings.colorHexPart(),
    repoSettings.isFavorite ? 1 : 0
  );
  if (info.changes < 1) {
    console.log(
      `No rows changed when updating user repo settings for repo '${repoUuid}' and user '${userUuid}'`
    );
  }
}

let getUserRepoSettingsStatement;
export function getUserRepoSettings(userUuid, repoUuid) {
  if (!getUserRepoSettingsStatement) {
    getUserRepoSettingsStatement = database.prepare(`
      SELECT
        rs.color, rs.is_favorite, r.name
      FROM
        repository_settings rs
      JOIN
        user u ON rs.user_id = u.id
      JOIN
        repository r ON rs.repo_id = r.id
      WHERE
        u.uuid = ? AND r.uuid = ?
    `);
  }

  return getUserRepoSettingsStatement.get(userUuid, repoUuid);
}

let getRepoAuthorMergingConfigStatement;
export function getRepoAuthorMergingConfig(userUuid, repoUuid) {
  if(!getRepoAuthorMergingConfigStatement) {
    getRepoAuthorMergingConfigStatement= database.prepare(`
      SELECT
        am.merging_config
      FROM
        repository_author_merging am
      JOIN
        user u ON am.user_id = u.id
      JOIN
        repository r ON am.repo_id = r.id
      WHERE
        u.uuid = ? AND r.uuid = ?
    `);
  }

  const row= getRepoAuthorMergingConfigStatement.get(userUuid, repoUuid);
  if(!row || !row.merging_config) {
    return null;
  }

  try {
    return JSON.parse(row.merging_config);
  } catch(e) {
    console.error(`Could not deserialize author merging config for user '${userUuid}' on repository '${repoUuid}'. (JSON '${row.merging_config}'): ${e}`);
  }

  return null;
}

let setRepoAuthorMergingConfigStatement;
/**
 * @param {string} userUuid
 * @param {string} repoUuid 
 * @param {any} mergingConfig 
 */
export function setRepoAuthorMergingConfig(userUuid, repoUuid, mergingConfig) {
  if (!setRepoAuthorMergingConfigStatement) {
    // We either try to update the existing record or create a new one. To make
    // this work, we need to first get the ID of the old one. If the ID is null
    // a new record is inserted.
    setRepoAuthorMergingConfigStatement = database.prepare(`
      INSERT OR REPLACE INTO
        repository_author_merging (id, user_id, repo_id, merging_config)
      VALUES (
        (SELECT
          am.id
        FROM
          repository_author_merging am
        JOIN
          user u ON am.user_id = u.id
        JOIN
          repository r ON am.repo_id = r.id
        WHERE
          u.uuid = ? AND r.uuid = ?
        ),
        (SELECT id from user WHERE uuid = ?),
        (SELECT id from repository WHERE uuid = ?),
        ?
    )`);
  }

  const info = setRepoAuthorMergingConfigStatement.run(
    userUuid,
    repoUuid,
    userUuid,
    repoUuid,
    JSON.stringify( mergingConfig )
  );
  if (info.changes < 1) {
    console.log(
      `No rows changed when updating author merging config for repo '${repoUuid}' and user '${userUuid}'`
    );
  }
}

let getRepoByUuidStatement;
export function getRepositoryByUuid(uuid) {
  if (!getRepoByUuidStatement) {
    getRepoByUuidStatement = database.prepare(
      `SELECT name, is_active FROM repository WHERE uuid = ?`
    );
  }
  return getRepoByUuidStatement.get(uuid);
}

let deleteRepoStatement;
let deleteRepoSettingsStatement;
export function deleteRepositoryByUuid(uuid) {
  if (!deleteRepoStatement) {
    deleteRepoStatement = database.prepare('DELETE FROM repository WHERE uuid=?');
  }
  if (!deleteRepoSettingsStatement) {
    deleteRepoSettingsStatement = database.prepare(
      'DELETE FROM repository_settings WHERE repo_id=?'
    );
  }

  deleteRepoStatement.run(uuid);
  deleteRepoSettingsStatement.run(uuid);
}
