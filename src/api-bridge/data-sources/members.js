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
    const { data: members } = await api.fetchAll('/projects/:id/members');

    // isBot is needed to keep members where only a personal access token is used and no project token
    const {
      status,
      message,
      id: botId,
      userName: botUsername,
      isBot
    } = await api.getAuthTokenAssociatedUser();

    // filter members as long as fetch was successful, otherwise ignore silently
    let filteredMembers = members;
    if (status !== 200) {
      console.log(`Could not filter authToken bot user from members list: ${message}`);
    } else {
      // keep members that do not fit id & username of the bot or if the authToken generally is no bot
      filteredMembers = members.filter(
        ({ id, username }) => (id != botId && username != botUsername) || !isBot
      );
    }

    const records = filteredMembers.map(({ id, username, name, email }) => ({
      id,
      username,
      name,
      email
    }));

    const storage = new Storage('members');
    await storage.insertRecords(repo, records);
  }
}
