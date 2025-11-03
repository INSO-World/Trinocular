import { writeFile } from 'node:fs/promises';
import zlib from 'node:zlib';
import path from 'node:path';
import { promisify } from 'node:util';
import { logger } from '../../common/index.js';
import { exportLogDataOlderThan, deleteEntriesOlderThanTimestamp } from './database.js';

const gzip = promisify(zlib.gzip);

/**
 * Create an ISO like timestamp for file names of the current time
 * @returns {string}
 */
function createFilenameDate() {
  const iso = new Date().toISOString();
  const datePart = iso.substring(0, 10);
  const timePart = iso.substring(12, 19).replaceAll(':', '-');
  return `${datePart}_${timePart}`;
}

/**
 * Stringify the provided data as JSON and save it as a gzip compressed file
 * @param {string} outputFilePath File path
 * @param {any} data Data to store
 * @returns {Promise<boolean>} Success
 */
async function saveCompressedJSON(outputFilePath, data) {
  try {
    const jsonData = JSON.stringify(data);
    const compressedData = await gzip(jsonData);
    await writeFile(outputFilePath, compressedData);

    logger.info(`Data compressed and stored at '${outputFilePath}'`);
  } catch (error) {
    logger.error('Error compressing and storing data: %s', error);
    return false;
  }

  return true;
}

/**
 * Archives all log entries in the database older than specified number of
 * days as gzip compressed file
 * @param {number} days
 * @returns {Promise<void>}
 */
export async function archiveDatabaseLogs(days) {
  // Get log entries to archive from db
  const { mostRecentEntryTime, entries } = await exportLogDataOlderThan(days);
  if (entries.length < 1) {
    return;
  }

  logger.info(`Archiving ${entries.length} database log entries`);

  // Make unique file name
  const date = createFilenameDate();
  const filePath = path.join(process.env.ARCHIVE_PATH, `trinocular_logs_${date}.json.gz`);

  // Compress and save the log entries as JSON
  const success = saveCompressedJSON(filePath, entries);
  if (!success) {
    return;
  }

  // Delete all entries from the db that are older than the most recent archived log entry
  await deleteEntriesOlderThanTimestamp(mostRecentEntryTime);

  logger.info(`Done archiving`);
}
