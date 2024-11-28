import { DataSource } from '../lib/data-source.js';
import { Storage } from '../lib/storage.js';

export class Milestones extends DataSource {
  endpointNames() {
    return ['milestones'];
  }

  async onInit() {
    const milestone_storage = new Storage('milestones');
    milestone_storage.ensureTable({
      id: 'INTEGER NOT NULL',
      iid: 'INTEGER NOT NULL',
      project_id: 'INTEGER NOT NULL',
      title: 'VARCHAR(100) NOT NULL',
      description: 'TEXT',
      due_date: 'DATE',
      start_date: 'DATE',
      state: 'VARCHAR(20)',
      updated_at: 'TIMESTAMPTZ NOT NULL',
      created_at: 'TIMESTAMPTZ NOT NULL',
      expired: 'BOOLEAN'
    });
  }

  async createSnapshot(repo) {
    const api = repo.api();
    const { data: milestones } = await api.fetchAll('/projects/:id/milestones');

    // Filter data
    const records = milestones.map(
      ({
         id,
         iid,
         project_id,
         title,
         description,
         due_date,
         start_date,
         state,
         updated_at,
         created_at,
         expired
       }) => ({
        id,
        iid,
        project_id,
        title,
        description,
        due_date,
        start_date,
        state,
        updated_at,
        created_at,
        expired
      })
    );

    const storage = new Storage('milestones');
    await storage.insertRecords(repo, records);
  }
}
