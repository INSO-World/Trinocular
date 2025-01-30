import { expect } from 'chai';
import * as chai from 'chai';
import request from 'supertest';
import sinonChai from 'sinon-chai';
import { promises as fsPromises } from 'fs';
import express from 'express';
import { routes } from '../routes/routes.js';
import { Scheduler } from '../lib/scheduler.js';
import { loadSchedules } from '../lib/persistence.js';
import { initLogger } from '../../common/index.js';

chai.use(sinonChai);

describe('schedules', () => {
  let app;
  const testFile = 'test-schedules.json';
  const intApiSecret = 'a-secret-string';
  const originalEnv = process.env;
  const repoUuid = 'bccaa660-ce51-473d-bab1-f70b51d79de0';
  const scheduleData = {
    cadence: 86400,
    startTime: '2024-12-19T00:00:00.000Z'
  };

  beforeEach(async () => {
    try {
      await initLogger(false);
    } catch (e) {}

    // Set up the environment variable
    process.env = { ...originalEnv, SCHEDULES_FILE: testFile, INTERNAL_API_SECRET: intApiSecret };

    app = express();
    app.use(express.json());

    Scheduler.create();
    Scheduler.the().setSchedules(await loadSchedules());
    app.use(routes);

    await request(app)
      .post(`/schedule/${repoUuid}`)
      .set('Authorization', `Bearer ${intApiSecret}`)
      .send(scheduleData)
      .expect(200);
  });

  afterEach(async () => {
    try {
      await request(app)
        .delete(`/schedule/${repoUuid}`)
        .set('Authorization', `Bearer ${intApiSecret}`)
        .expect(204);
    } catch (e) {
      console.log('No schedule to delete');
    }

    Scheduler.the().stopTimer();
    process.env = originalEnv;

    // Clean up the test schedules file, if it exists
    try {
      await fsPromises.unlink(testFile);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        throw err;
      }
    }
  });

  it('getSchedules should return empty array when no schedules stored', async () => {
    try {
      await request(app)
        .delete(`/schedule/${repoUuid}`)
        .set('Authorization', `Bearer ${intApiSecret}`)
        .expect(204);
    } catch (e) {
      console.log('No schedule to delete');
    }

    const response = await request(app)
      .get('/schedule')
      .set('Authorization', `Bearer ${intApiSecret}`)
      .expect(200);

    expect(response.body).to.deep.equal([]);
  });

  it('Schedules should be returned after schedule is stored', async () => {
    const repoUuid = 'bccaa660-ce51-473d-bab1-f70b51d79de0';
    const scheduleData = {
      cadence: 86400,
      startTime: '2024-12-19T00:00:00.000Z'
    };

    // Create a schedule
    const postResponse = await request(app)
      .post(`/schedule/${repoUuid}`)
      .set('Authorization', `Bearer ${intApiSecret}`)
      .send(scheduleData) // Send the schedule data
      .expect(200); // Expect successful creation

    // Fetch the schedules
    const getResponse = await request(app)
      .get('/schedule')
      .set('Authorization', `Bearer ${intApiSecret}`)
      .expect(200); // Expect successful fetch

    expect(getResponse.body).to.deep.equal([
      {
        repoUuid: repoUuid,
        cadence: scheduleData.cadence,
        state: 'waiting'
      }
    ]);
  });

  it('should get a schedule by UUID', async () => {
    const response = await request(app)
      .get(`/schedule/${repoUuid}`)
      .set('Authorization', `Bearer ${intApiSecret}`)
      .expect(200);

    const currentDate = new Date();
    expect(response.body.repoUuid).to.equal(repoUuid);
    expect(response.body.cadence).to.equal(86400);
    expect(new Date(response.body.startDate)).to.be.at.least(currentDate);
  });

  it('should update a schedule using PUT', async () => {
    const updatedScheduleData = {
      cadence: 86400,
      startTime: '2024-12-20T00:00:00.000Z'
    };

    await request(app)
      .put(`/schedule/${repoUuid}`)
      .set('Authorization', `Bearer ${intApiSecret}`)
      .send(updatedScheduleData)
      .expect(200);

    const response = await request(app)
      .get(`/schedule/${repoUuid}`)
      .set('Authorization', `Bearer ${intApiSecret}`)
      .expect(200);

    const currentDate = new Date();
    expect(response.body.repoUuid).to.equal(repoUuid);
    expect(response.body.cadence).to.equal(updatedScheduleData.cadence);
    expect(new Date(response.body.startDate)).to.be.at.least(currentDate);
  });

  it('should delete a schedule by UUID', async () => {
    await request(app)
      .delete(`/schedule/${repoUuid}`)
      .set('Authorization', `Bearer ${intApiSecret}`)
      .expect(204);

    await request(app)
      .get(`/schedule/${repoUuid}`)
      .set('Authorization', `Bearer ${intApiSecret}`)
      .expect(404);
  });
});
