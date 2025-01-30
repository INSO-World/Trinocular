import { DataSource } from '../lib/data-source.js';
import { Storage } from '../lib/storage.js';
import { gql } from 'graphql-request';

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
      email: 'VARCHAR(100)',
      has_spent_time: 'BOOLEAN'
    });
  }

  async createSnapshot(repo) {
    const api = repo.api();
    const restRecords = await this._getMembersREST(api);
    const graphqlRecords = await this._getMembersGraphQL(api);

    // Merge lists of fetched members
    const mergedRecordsMap = new Map();

    restRecords.forEach(user => {
      mergedRecordsMap.set(user.id, { ...user, has_spent_time: false });
    });

    graphqlRecords.forEach(user => {
      if (!mergedRecordsMap.has(user.id)) {
        mergedRecordsMap.set(user.id, user);
      } else {
        const existingMember = mergedRecordsMap.get(user.id);
        // Merge fields (e.g., prefer non-null email)
        mergedRecordsMap.set(user.id, {
          ...existingMember,
          email: existingMember.email || user.email
        });
      }
    });

    const mergedRecords = Array.from(mergedRecordsMap.values());

    const storage = new Storage('members');
    await storage.insertRecords(repo, mergedRecords);
  }

  /**
   * @param {GitLabAPI} api
   */
  async _getMembersREST(api) {
    let { data: members } = await api.fetchAll('/projects/:id/members');

    // filter members that match the bot name pattern
    const botRegex = /project_[a-fA-F\d]+_bot_[a-fA-F\d]+/;

    const records = members
      .filter(({ username }) => !botRegex.test(username))
      .map(({ id, username, name, email }) => ({
        id,
        username,
        name,
        email
      }));

    return records;
  }

  /**
   * @param {GitLabAPI} api
   */
  async _getMembersGraphQL(api) {
    function mapNode(node) {
      return {
        id: parseInt(node.user.id.substring('gid://gitlab/User/'.length)),
        username: node.user.username,
        name: node.user.name,
        email: node.user.emails.nodes.length > 0 ? node.user.emails.nodes[0].email : null,
        has_spent_time: true
      };
    }

    const records = await api.queryAll(
      gql`
        query getMembersOfTimelogs($projectId: ID!, $endCursor: String) {
          project(fullPath: $projectId) {
            timelogs(first: 100, after: $endCursor) {
              nodes {
                user {
                  id
                  username
                  name
                  emails(first: 1) {
                    nodes {
                      email
                    }
                  }
                }
              }
              pageInfo {
                endCursor
                hasNextPage
              }
            }
          }
        }
      `,
      page => ({
        nodes: page.project.timelogs.nodes.map(mapNode),
        pageInfo: page.project.timelogs.pageInfo
      })
    );

    const uniqueMembersMap = new Map();

    records.forEach(record => {
      if (!uniqueMembersMap.has(record.id)) {
        uniqueMembersMap.set(record.id, record);
      }
    });

    return Array.from(uniqueMembersMap.values());
  }
}
