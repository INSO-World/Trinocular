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

export async function getRepoDetailsFromDatabase(uuid) {
  const result = await pool.query(
    `SELECT created_at, updated_at
     FROM repo_details
     WHERE uuid = $1`,
    [uuid]
  );
  console.log('db result',result);
  return result.rows[0]
}
