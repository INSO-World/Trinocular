import { DataSource } from '../lib/data-source.js';
import { Storage } from '../lib/storage.js';

export class Members extends DataSource {
  endpointNames() {
    return ['members'];
  }

  async onInit() {
    const storage = new Storage('members');
    storage.ensureTable({
      id: 'INTEGER NOT NULL',
      username: 'VARCHAR(100) NOT NULL',
      name: 'VARCHAR(100)',
      email: 'VARCHAR(100)'
    });
  }

  async createSnapshot(repo) {
    const api = repo.api();
    let { data: members } = await api.fetchAll('/projects/:id/members');

    // filter members that match the bot name pattern
    const botRegex = /project_[a-fA-F\d]+_bot_[a-fA-F\d]+/;

    const records = members
      .filter( ({ username }) => !botRegex.test(username))
      .map(({ id, username, name, email }) => ({
        id,
        username,
        name,
        email
    }));

    const storage = new Storage('members');
    await storage.insertRecords(repo, records);
  }
}
