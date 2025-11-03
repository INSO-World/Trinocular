import {
  clearRepositoryRecordsFromTable,
  clearTable,
  createTableIfNotExists,
  getRecordFromTableById,
  getRecordsFromTable,
  insertRecordsIntoTable
} from './database.js';

export class Storage {
  /**
   * @param {string} endpoint
   */
  constructor(endpoint) {
    this.endpoint = endpoint;
    this.tableName = `dyn_${this.endpoint}`;
  }

  /**
   * @param {Object.<string, string>} columns Columns and their types as key-value-pairs
   */
  async ensureTable(columns) {
    // Only allow simple {string: string} objects
    for (const name in columns) {
      if (!columns[name] || typeof columns[name] !== 'string') {
        throw Error(
          `Storage table declaration for endpoint '${this.endpoint}' has invalid column definition (${name} : ${columns[name]})`
        );
      }
    }

    // ID column must exist and be a primary key
    if (!Object.hasOwn(columns, 'id')) {
      throw Error(
        `Storage table declaration for endpoint '${this.endpoint}' is missing an id column`
      );
    }

    if (columns.id.toLowerCase().includes('key')) {
      throw Error(
        `Storage table declaration for endpoint '${this.endpoint}' has id column declared as key. (Key is generated automatically)`
      );
    }

    // The repository_id column name is reserved
    if (Object.hasOwn(columns, 'repository_id')) {
      throw Error(
        `Storage table declaration for endpoint '${this.endpoint}' uses reserved column name 'repository_id'`
      );
    }

    columns.repository_id = 'INTEGER NOT NULL REFERENCES repository (id) ON DELETE CASCADE';

    createTableIfNotExists(this.tableName, columns, {
      compositePrimaryKey: ['id', 'repository_id']
    });
  }

  async clear(repo) {
    if (!repo) {
      return clearTable(this.tableName);
    }

    return clearRepositoryRecordsFromTable(this.tableName, repo.dbId);
  }

  async insertRecords(repo, records) {
    records.forEach(record => (record.repository_id = repo.dbId));
    await insertRecordsIntoTable(this.tableName, records);
  }

  /**
   * @param {Repository} repo
   * @param {string|number} id
   * @returns {Object.<string, any>}
   */
  async getRecordById(repo, id) {
    return getRecordFromTableById(this.tableName, repo.dbId, id);
  }

  /**
   * @param {Repository} repo
   * @returns {Object.<string, any>}
   */
  async getAllRecords(repo) {
    return getRecordsFromTable(this.tableName, repo.dbId);
  }
}
