import {pool, pg} from '../../postgres-utils/index.js';


/**
 * @param {string} uuid
 */
export async function getBurndownChartData(uuid) {
  pg.types.setTypeParser(1082, (val) => val); // 1082 is the OID for date type
  const result = await pool.query(
    `SELECT date, open_issues, open_issues_info
     FROM issue
     WHERE uuid = $1
     ORDER BY date`,
    [uuid]
  );
  return result.rows
}
