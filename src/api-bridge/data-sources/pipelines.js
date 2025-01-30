import { DataSource } from '../lib/data-source.js';
import { Storage } from '../lib/storage.js';

export class Pipelines extends DataSource {
  endpointNames() {
    return ['pipelines'];
  }

  async onInit() {
    const storage = new Storage('pipelines');
    storage.ensureTable({
      id: 'INTEGER NOT NULL',
      ref: 'VARCHAR(255) NOT NULL',
      status: 'VARCHAR(50) NOT NULL',
      source: 'VARCHAR(50) NOT NULL',
      created_at: 'TIMESTAMP WITH TIME ZONE NOT NULL',
      updated_at: 'TIMESTAMP WITH TIME ZONE NOT NULL',
      name: 'VARCHAR(255)'
    });
  }

  async createSnapshot(repo) {
    const api = repo.api();
    const { data: pipelines } = await api.fetchAll('/projects/:id/pipelines');

    // Filter data
    const records = pipelines.map(({ iid, ref, status, source, created_at, updated_at, name }) => ({
      id: iid,
      ref: ref ? ref.substring(0, 255) : null, // Limit ref length to 255 characters
      status,
      source,
      created_at,
      updated_at,
      name: name ? name.substring(0, 255) : null // Limit name length to 255 characters
    }));

    const storage = new Storage('pipelines');
    await storage.insertRecords(repo, records);
  }
}
