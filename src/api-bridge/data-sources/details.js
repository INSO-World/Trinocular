import { DataSource } from '../lib/data-source.js';
import { Storage } from '../lib/storage.js';

export class Details extends DataSource {
  endpointNames() {
    return ['details'];
  }

  async onInit() {
    const storage = new Storage('details');
    storage.ensureTable({
      id: 'INTEGER NOT NULL',
      description: 'VARCHAR(255)',
      ssh_url_to_repo: 'VARCHAR(255)',
      http_url_to_repo: 'VARCHAR(255)',
      created_at: 'TIMESTAMPTZ',
      updated_at: 'TIMESTAMPTZ'
    });
  }

  async createSnapshot(repo) {
    const api = repo.api();
    const { data: repoDetails } = await api.fetch(`/projects/:id`);

    // Filter data
    const records = [repoDetails].map(
      ({ id, description, ssh_url_to_repo, http_url_to_repo, created_at, updated_at }) => ({
        id,
        description,
        ssh_url_to_repo,
        http_url_to_repo,
        created_at,
        updated_at
      })
    );

    const storage = new Storage('details');
    await storage.insertRecords(repo, records);
  }
}
