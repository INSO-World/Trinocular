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

    try {
      // isBot is needed to keep members where only a personal access token is used and no project token
      const { id: botId, userName: botUsername, isBot } = await api.getAuthTokenAssociatedUser();

      // keep members that do not fit id & username of the bot or if the authToken generally is no bot
      if (isBot) {
        members = members.filter(({ id, username }) => id !== botId && username !== botUsername);
      }
      // TODO: maybe adapt to filter out combination of "PROJECT_ID_bot_"
      // additionally filter other members that have the typical '_bot_' in their name
      members = members.filter( ({ username }) => !username.includes('_bot_'));

    } catch (e) {
      // filter members as long as fetch was successful, otherwise just ignore
      console.error(`Could not filter authToken bot user from members list:`, e);
    }

    const records = members.map(({ id, username, name, email }) => ({
      id,
      username,
      name,
      email
    }));

    const storage = new Storage('members');
    await storage.insertRecords(repo, records);
  }
}
