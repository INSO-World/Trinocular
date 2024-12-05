import {pool} from "../../postgres-utils/index.js";

/**
 * @param {string} uuid
 */
export async function getIssuesFromDatabase(uuid) {
  const result = await pool.query(
    `SELECT iid, title, created_at, closed_at, total_time_spent
     FROM issue
     WHERE uuid = $1`,
    [uuid]
  );
  return result.rows
}
