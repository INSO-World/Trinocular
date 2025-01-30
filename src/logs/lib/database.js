import Cursor from 'pg-cursor';
import { pool } from '../../postgres-utils/index.js';

/**
 * Delete all entries older than the provided number of days
 * @param {number} days
 * @returns {number} Number of deleted entries
 */
export async function deleteEntriesOlderThan(days) {
  const result = await pool.query(
    `DELETE FROM fluentbit WHERE time < NOW() - $1 * INTERVAL '1 day'`,
    [days]
  );

  return result.rowCount;
}

/**
 * Delete all entries older than the provided timestamp (inclusive)
 * @param {string|Date} timestamp
 * @returns {number} Number of deleted entries
 */
export async function deleteEntriesOlderThanTimestamp(timestamp) {
  const result = await pool.query(`DELETE FROM fluentbit WHERE time <= $1`, [timestamp]);

  return result.rowCount;
}

export async function hasEntryOlderThan(days) {
  const result = await pool.query(
    `SELECT 1 FROM fluentbit WHERE time < NOW() - $1 * INTERVAL '1 day' LIMIT 1`,
    [days]
  );

  return result.rows.length >= 1;
}

export async function exportLogDataOlderThan(days) {
  let client = null;
  const entries = [];
  let mostRecentEntryTime = null;

  try {
    client = await pool.connect();

    const cursor = await client.query(
      new Cursor(
        `SELECT time, data FROM fluentbit WHERE time < NOW() - $1 * INTERVAL '1 day' ORDER BY time ASC`,
        [days]
      )
    );

    // Read batches of 100 log data entries from the db to
    // add to the array
    while (true) {
      const rows = await cursor.read(100);

      if (!rows.length) {
        break;
      }

      for (const row of rows) {
        entries.push(row.data);
        mostRecentEntryTime = row.time;
      }
    }

    cursor.close();
  } catch (error) {
    throw Error('Could not export log data', {
      cause: error
    });
  } finally {
    client.release();
  }

  return { mostRecentEntryTime, entries };
}

export async function getEntryCount() {
  const result = await pool.query(`SELECT COUNT(*) as count FROM fluentbit`);

  return result.rows.length < 1 ? 0 : result.rows[0].count;
}

/**
 * Finds all unique tag names of all log entries
 * @returns {Promise<string[]>}
 */
export async function getTags() {
  const result = await pool.query(`SELECT DISTINCT tag FROM fluentbit`);

  return result.rows.map(row => row.tag);
}

/**
 * Find all log entries that match specified query parameters. The function also counts all available entries
 * that match the query, even when limiting the output to a certain page size, so that the number of remaining
 * pages can be calculated.
 * @param {string} tag
 * @param {string?} searchString
 * @param {Date?} startDate
 * @param {Date?} endDate
 * @param {string[]} levels
 * @param {number} pageSize
 * @param {number} pageNumber
 * @returns {Promise<{totalRowCount: number, entries: {message: string, ts: number}[]}>}
 */
export async function findLogEntries(
  tag,
  searchString,
  startDate,
  endDate,
  levels,
  pageSize,
  pageNumber
) {
  // Disable the tag filter when it is set to 'all'
  tag = tag === 'all' ? null : tag;

  // Escape and build the LIKE clause or disable the text search filter
  if (searchString) {
    searchString = searchString
      .replaceAll('\\', '\\\\')
      .replaceAll('%', '\\%')
      .replaceAll('_', '\\_')
      .toLowerCase();
    searchString = `%${searchString}%`;
  } else {
    searchString = null;
  }

  // Disable the level check if the levels array is empty
  const noLevelCheck = levels.length ? 0 : 1;
  const offset = pageNumber * pageSize;

  const queryParams = [
    tag,
    searchString,
    startDate?.toISOString(),
    endDate?.toISOString(),
    pageSize,
    offset,
    noLevelCheck
  ];

  // Add the params to the IN clause for the level filter
  const levelParams = noLevelCheck
    ? ['NULL']
    : levels.map(level => {
        queryParams.push(level);
        return '$' + queryParams.length;
      });

  const result = await pool.query(
    `
    SELECT *, COUNT(*) OVER() AS total_rows
    FROM fluentbit
    WHERE 
      (tag = $1 OR $1 IS NULL) AND
      (LOWER(data->>'message') LIKE $2 OR $2 IS NULL) AND
      (LOWER(data->>'level') IN (${levelParams.join(',')}) OR $7 = 1) AND
      (time >= $3 OR $3 IS NULL) AND
      (time <= $4 OR $4 IS NULL)
    ORDER BY time DESC
    LIMIT $5 OFFSET $6;
  `,
    queryParams
  );

  // Every row contains the total row count, so we just take it from the first one
  const totalRowCount = result.rows.length ? result.rows[0].total_rows : 0;
  return {
    totalRowCount,
    entries: result.rows
  };
}
