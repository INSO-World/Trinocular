import { expect } from 'chai';
import * as chai from 'chai';
import sinonChai from 'sinon-chai';
import { promises as fsPromises } from 'fs';
import {loadSchedules, storeSchedules} from "../lib/persistence.js";

chai.use(sinonChai);
describe('persistence', () => {
  const testFile = 'test-schedules.json';
  const originalEnv = process.env;

  beforeEach(() => {
    // Set up the environment variable
    process.env = { ...originalEnv, SCHEDULES_FILE: testFile };
  });

  afterEach(async () => {
    // Clean up the test schedules file, if it exists
    process.env = originalEnv;
    try {
      await fsPromises.unlink(testFile);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        throw err;
      }
    }
  });

  it('should store schedules to the schedules file and verify its content', async () => {
    const schedules = [
      {
        repoUuid: 'bccaa660-ce51-473d-bab1-f70b51d79de0',
        cadence: 86400,
        nextRunDate: new Date('2024-12-18'),
      },
    ];

    await storeSchedules(schedules);

    // Read the file back
    const loadedSchedules = await loadSchedules();

    // Verify the written content
    expect(loadedSchedules).to.deep.equal([
      {
        repoUuid: 'bccaa660-ce51-473d-bab1-f70b51d79de0',
        cadence: 86400,
        nextRunDate: new Date('2024-12-18'),
        runningUpdateTask: null
      },
    ]);
  });

  it('should store schedules twice and only contain second schedules', async () => {
    const schedules1 = [
      {
        repoUuid: 'bccaa660-ce51-473d-bab1-f70b51d79de0',
        cadence: 86400,
        nextRunDate: new Date('2024-12-18'),
      },
    ];

    const schedules2 = [
      {
        repoUuid: 'bccaa660-ce51-473d-bab1-f70b51d79fff',
        cadence: 86400,
        nextRunDate: new Date('2024-12-19'),
      },
    ];

    await storeSchedules(schedules1);
    await storeSchedules(schedules2);

    // Read the file back
    const loadedSchedules = await loadSchedules();

    // Verify the written content
    expect(loadedSchedules).to.deep.equal([
      {
        repoUuid: 'bccaa660-ce51-473d-bab1-f70b51d79fff',
        cadence: 86400,
        nextRunDate: new Date('2024-12-19'),
        runningUpdateTask: null
      },
    ]);
  });

  it('storeSchedules should throw an error if SCHEDULES_FILE is not defined', async () => {
    delete process.env.SCHEDULES_FILE;

    const schedules = [
      {
        repoUuid: 'bccaa660-ce51-473d-bab1-f70b51d79de0',
        cadence: 86400,
        nextRunDate: new Date('2024-12-25'),
      },
    ];

    try {
      await storeSchedules(schedules);
      throw new Error('Expected storeSchedules to throw, but it did not');
    } catch (error) {
      expect(error.message).to.include('argument must be of type string');
    }

    // Verify that schedules file was not created
    try {
      await fsPromises.access(testFile);
      throw new Error('Expected the file not to exist, but it does');
    } catch (e) {
      expect(e.code).to.equal('ENOENT');
    }
  });

  it('loadSchedules should throw array if SCHEDULES_FILE is not defined', async () => {
    delete process.env.SCHEDULES_FILE;

    try {
      const schedules = await loadSchedules();
      throw new Error('Expected loadSchedules to throw, but it did not');
    } catch (error) {
      expect(error.message).to.include('Could not load schedule from \'undefined\'');
    }
  });

  it('loadSchedules should return empty array if SCHEDULES_FILE does not exist', async () => {
    const schedules = await loadSchedules();
    expect(schedules).to.deep.equal([]);

  });
});
