import { DataSource } from '../lib/data-source.js';
import { Storage } from '../lib/storage.js';
import { gql } from 'graphql-request';

export class TimeLogs extends DataSource {
  endpointNames() {
    return ['timelogs'];
  }

  async onInit() {
    const storage = new Storage('timelogs');
    storage.ensureTable({
      id: 'INTEGER NOT NULL',
      spent_at: 'TIMESTAMPTZ NOT NULL',
      time_spent: 'INTEGER NOT NULL',
      user_id: 'INTEGER NOT NULL',
      issue_iid: 'INTEGER', // May be null
      merge_request_iid: 'INTEGER' // May be null
    });
  }

  async createSnapshot(repo) {
    function mapNode(node) {
      return {
        id: parseInt(node.id.substring('gid://gitlab/Timelog/'.length)),
        spent_at: node.spentAt,
        time_spent: node.timeSpent,
        user_id: parseInt(node.user.id.substring('gid://gitlab/User/'.length)),
        issue_iid: node.issue ? parseInt(node.issue.iid) : null,
        merge_request_iid: node.mergeRequest ? parseInt(node.mergeRequest.iid) : null
      };
    }

    const api = repo.api();
    const records = await api.queryAll(
      gql`
        query getTimelogs($projectId: ID!, $endCursor: String) {
          project(fullPath: $projectId) {
            timelogs(first: 100, after: $endCursor) {
              nodes {
                id
                spentAt
                timeSpent
                user {
                  id
                }
                issue {
                  iid
                }
                mergeRequest {
                  iid
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

    // console.table( records );
    // console.log('Got records:', records.length);

    const storage = new Storage('timelogs');
    await storage.insertRecords(repo, records);
  }
}
