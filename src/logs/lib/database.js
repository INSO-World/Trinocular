import Cursor from 'pg-cursor';
import { pool } from '../../postgres-utils/index.js'

/**
 * Delete all entries older than the provided number of days
 * @param {number} days 
 * @returns {number} Number of deleted entries
 */
export async function deleteEntriesOlderThan( days ) {
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
export async function deleteEntriesOlderThanTimestamp( timestamp ) {
  const result = await pool.query(
    `DELETE FROM fluentbit WHERE time <= $1`,
    [timestamp]
  );

  return result.rowCount;
}

export async function hasEntryOlderThan( days ) {
  const result = await pool.query(
    `SELECT 1 FROM fluentbit WHERE time < NOW() - $1 * INTERVAL '1 day' LIMIT 1`,
    [days]
  );

  return result.rows.length >= 1;
}

export async function exportLogDataOlderThan( days ) {
  let client = null;
  const entries= [];
  let mostRecentEntryTime= null;

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
        mostRecentEntryTime= row.time;
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
