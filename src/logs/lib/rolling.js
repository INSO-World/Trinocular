import { flagIsSet, logger } from '../../common/index.js';
import { archiveDatabaseLogs } from './archive.js';
import { deleteEntriesOlderThan, hasEntryOlderThan } from './database.js';

const UPDATE_INTERVAL = 15 * 60 * 1000;

async function rollDatabaseLogs(retentionDays, archiveLogs) {
  try {
    // Just delete old log entries
    if (!archiveLogs) {
      const deleteCount = await deleteEntriesOlderThan(retentionDays);
      logger.info(`Deleted ${deleteCount} database log entries`);
      return;
    }

    // Archive old log entries if we have more than twice the retention backlog
    const hasDataToArchive = await hasEntryOlderThan(2 * retentionDays);
    if (hasDataToArchive) {
      await archiveDatabaseLogs(retentionDays);
    }
  } catch (e) {
    logger.error(`Could not perform log update: %s`, e);
  }
}

let updateTimer = null;
export function initRollingLogs() {
  stopRollingUpdateTimer();

  const retentionDays = parseInt(process.env.LOG_RETENTION_DAYS);
  if (Number.isNaN(retentionDays) || retentionDays <= 0) {
    logger.info('Rolling logs in the db are disabled');
    return;
  }

  logger.info(`Rolling logs retention in the db is set to ${retentionDays} days`);

  const archiveLogs = flagIsSet('ARCHIVE_LOGS');

  if (archiveLogs && !process.env.ARCHIVE_PATH) {
    throw Error(`Env variable ARCHIVE_PATH is required when archiving is enabled`);
  }

  logger.info(`Log archiving is ${archiveLogs ? 'enabled' : 'disabled'}`);

  // Start update timer
  updateTimer = setInterval(() => rollDatabaseLogs(retentionDays, archiveLogs), UPDATE_INTERVAL);
}

export function stopRollingUpdateTimer() {
  if (updateTimer !== null) {
    clearInterval(updateTimer);
    updateTimer = null;
  }
}
