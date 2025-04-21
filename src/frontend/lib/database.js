import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { logger } from '../../common/index.js';

/**
 * @typedef {import('./repo-settings.js').RepositorySettings} RepositorySettings
 */

export let database = null;

export function initDatabase(dbFile, initScriptFile) {
  if (database) {
    throw Error(`SQLite Database already initialized`);
  }

  database = new Database(dbFile);
  database.pragma('journal_mode = WAL');

  if (initScriptFile) {
    initScriptFile = path.resolve(initScriptFile);
    logger.info(`Running database init script: '${initScriptFile}'`);

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
export function addNewRepository(name, uuid) {
  if (!ensureRepositoryStatement) {
    //automatically set the repository to active
    ensureRepositoryStatement = database.prepare(
      `INSERT INTO repository(name,uuid,is_active) VALUES (?, ?, 1)`
    );
  }
  const info = ensureRepositoryStatement.run(name, uuid);

  if (info.changes > 0) {
    logger.info('Inserted new repository: %s', name);
  }
}

// statement is generated once, reused every time the function is called
let ensureUserStatement;

/**
 *  adds the user with userUuid to the frontend database, if it is not already in there
 */
export function ensureUser(userUuid) {
  if (!ensureUserStatement) {
    ensureUserStatement = database.prepare(
      `INSERT INTO user (uuid) SELECT ? WHERE NOT EXISTS (SELECT 1 FROM user WHERE uuid = ?)`
    );
  }

  const info = ensureUserStatement.run(userUuid, userUuid);

  if (info.changes > 0) {
    logger.info(`Inserted new user UUID: '${userUuid}'`);
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
      logger.error(`Could not dump table '${name}': %s`, e);
    }
  }

  return tables;
}

let getAllReposStatement;
export function getAllRepos(onlyActiveRepos= false) {
  if (!getAllReposStatement) {
    getAllReposStatement = database.prepare(
      `SELECT * FROM repository WHERE is_active = 1 OR ? = 1`
    );
  }
  return getAllReposStatement.all(onlyActiveRepos ? 0 : 1);
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
    logger.info(
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

let getRepoDashboardConfigStatement;
export function getRepoDashboardConfig(userUuid, repoUuid) {
  if (!getRepoDashboardConfigStatement) {
    getRepoDashboardConfigStatement = database.prepare(`
      SELECT
        dc.config
      FROM
        repository_dashboard_config dc
      JOIN
        user u ON dc.user_id = u.id
      JOIN
        repository r ON dc.repo_id = r.id
      WHERE
        u.uuid = ? AND r.uuid = ?
    `);
  }

  const row = getRepoDashboardConfigStatement.get(userUuid, repoUuid);
  if (!row || !row.config) {
    return null;
  }

  try {
    return JSON.parse(row.config);
  } catch (e) {
    logger.error(
      `Could not deserialize dashboard config for user '${userUuid}' on repository '${repoUuid}'. (JSON '${row.merging_config}'): %s`,
      e
    );
  }

  return null;
}

let setRepoDashboardConfigStatement;
/**
 * @param {string} userUuid
 * @param {string} repoUuid
 * @param {any} mergingConfig
 */
export function setRepoDashboardConfig(userUuid, repoUuid, dashboardConfig) {
  if (!setRepoDashboardConfigStatement) {
    // We either try to update the existing record or create a new one. To make
    // this work, we need to first get the ID of the old one. If the ID is null
    // a new record is inserted.
    setRepoDashboardConfigStatement = database.prepare(`
      INSERT OR REPLACE INTO
        repository_dashboard_config (id, user_id, repo_id, config)
      VALUES (
        (SELECT
          dc.id
        FROM
          repository_dashboard_config dc
        JOIN
          user u ON dc.user_id = u.id
        JOIN
          repository r ON dc.repo_id = r.id
        WHERE
          u.uuid = ? AND r.uuid = ?
        ),
        (SELECT id from user WHERE uuid = ?),
        (SELECT id from repository WHERE uuid = ?),
        ?
    )`);
  }

  const info = setRepoDashboardConfigStatement.run(
    userUuid,
    repoUuid,
    userUuid,
    repoUuid,
    JSON.stringify(dashboardConfig)
  );
  if (info.changes < 1) {
    logger.info(
      `No rows changed when updating dashboard config for repo '${repoUuid}' and user '${userUuid}'`
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
