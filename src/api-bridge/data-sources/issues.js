import { DataSource } from '../lib/data-source.js';
import { Storage } from '../lib/storage.js';

export class Issues extends DataSource {
  endpointNames() {
    return ['issues'];
  }

  async onInit() {
    const issue_storage = new Storage('issues');
    issue_storage.ensureTable({
      id: 'INTEGER NOT NULL',
      title: 'VARCHAR(100) NOT NULL',
      labels: 'TEXT[]',
      created_at: 'TIMESTAMPTZ NOT NULL',
      closed_at: 'TIMESTAMPTZ',
      time_estimate: 'INTEGER',
      total_time_spent: 'INTEGER',
      human_total_time_spent: 'VARCHAR(20)'
    });
  }

  async createSnapshot(repo) {
    const api = repo.api();
    const { data: issues } = await api.fetchAll('/projects/:id/issues?scope=all');

    // Filter data
    const records = issues.map(
      ({
        iid,
        title,
        labels,
        created_at,
        closed_at,
        time_stats: { time_estimate, total_time_spent, human_total_time_spent }
      }) => ({
        id: iid,
        title : title.substring(0,100),
        labels,
        created_at,
        closed_at,
        time_estimate,
        total_time_spent,
        human_total_time_spent
      })
    );

    const storage = new Storage('issues');
    await storage.insertRecords(repo, records);
  }
}
