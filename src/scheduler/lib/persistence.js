import { readFile, writeFile } from 'node:fs/promises';
import Joi from 'joi';
import { Schedule } from './scheduler.js';

const fileValidator = Joi.array()
  .items(
    Joi.object({
      repoUuid: Joi.string().uuid().required(),
      cadence: Joi.number().positive().integer().required(),
      nextRunDate: Joi.string().isoDate().required()
    })
  )
  .required();

/**
 * @param {Schedule[]} schedules
 * @returns {Promise<void>}
 */
export async function storeSchedules(schedules) {
  // Convert the schedule objects to entries that can be serialized
  const entries = schedules.map(schedule => ({
    repoUuid: schedule.repoUuid,
    cadence: schedule.cadence,
    nextRunDate: schedule.nextRunDate.toISOString()
  }));

  // Stringify the entries and persist them
  const json = JSON.stringify(entries);
  await writeFile(process.env.SCHEDULES_FILE, json);
}

/**
 * @returns {Promise<Schedule[]>}
 */
export async function loadSchedules() {
  let scheduleData;

  try {
    // Try to read the file and parse the JSON within
    const json = await readFile(process.env.SCHEDULES_FILE, 'utf-8');
    scheduleData = JSON.parse(json);
  } catch (e) {
    // The file contains bad JSON
    if (e instanceof SyntaxError) {
      throw new Error(
        `Could not load schedule from '${process.env.SCHEDULES_FILE}'. Invalid JSON file.`,
        { cause: e }
      );
    }

    // The file does not exist yet -> This is fine
    if (e instanceof Error && e.code === 'ENOENT') {
      console.log(
        `No schedules found to load. File '${process.env.SCHEDULES_FILE}' does not exist`
      );
      return [];
    }

    // Some other error
    throw new Error(`Could not load schedule from '${process.env.SCHEDULES_FILE}'.`, { cause: e });
  }

  // Validate the contents
  const { error, value } = fileValidator.validate(scheduleData);
  if (error) {
    throw new Error(
      `Could not load schedule from '${process.env.SCHEDULES_FILE}'. Invalid data: ${error.message}`,
      { cause: error }
    );
  }

  console.log(`Loaded ${value.length} schedule entries from file '${process.env.SCHEDULES_FILE}'`);

  // Create actual schedule objects from the persisted entries
  return value.map(
    entry => new Schedule(entry.repoUuid, new Date(entry.nextRunDate), entry.cadence)
  );
}
