import { formatInsertManyValues, pool } from '../../postgres-utils/index.js';

// TODO: Create function to retrieve data from the database
export async function getDemoData(uuid) {
  const result = await pool.query(
    `SELECT *
     FROM demo
     WHERE uuid = $1
     ORDER BY date`,
    [uuid]
  );
  return result.rows;
}

// TODO: Create function to insert data into the database
export async function insertDemoData(uuid, demoData) {

}
