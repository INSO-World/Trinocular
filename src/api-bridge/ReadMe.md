# Api Bridge Service

## Description

The api bridge service handles the data requests to
the [GitLab REST API](https://docs.gitlab.com/ee/api/api_resources.html). It acts as a bridge, fetching data from
the external [GitLab REST API](https://docs.gitlab.com/ee/api/api_resources.html), in batches, in so-called snapshots.
Requests from internal services can therefore be
handled efficiently, by not needing to fetch an external resource every time but have the data stored locally. Further,
requests to the external API are reduced. Datasources define which external resources should be
fetched and what should be stored, for more information see [Datasources](#datasources)
and [How to create a new datasource](#how-to-create-a-new-datasource).

## Dockerfile

The api bridge service is a regular NodeJS service with an AlpineLinux base image and necessary utils to access the
postgres service.

## Datasources

A datasource is the core concept of the api bridge service. It defines which data is fetched from the external
GitLabAPI and preprocesses to filter/combine data from different external endpoints. The data is then stored locally in
dynamic tables and can be fetched from there for internal
requests. [How to create a new datasource](#how-to-create-a-new-datasource) is
described [here](#how-to-create-a-new-datasource).

## Startup sequence

Upon startup, the api bridge connects to and initializes the Postgres database. An instance of the ApiBridge class is
created, which handles the access to the database. Instances of the defined datasources are created to create the
dynamic tables for them in the database in the next step. For fast access, Repositories are loaded from the database as
well. The endpoints for accessing the repository information, creating snapshots and the datasources are generated and
registered to the router.

## Tutorials

### How to create a new datasource

Create a new file under api-bridge/data-sources and create a new class which extends _DataSource_. It already defines
which methods need to be implemented:

#### `endpointNames()`

Here the name of the endpoint for the datasource is defined and should be returned in a list as a single string. E.g.:
``['my-datasource']``

#### `onInit()`

This method defines what happens upon initialization. The persistent storage for the datasource needs to be initialized
by creating an instance of class _Storage_ and giving it the previously defined endpoint name. Further, the structure of
the dynamic table being created is to be stated in Postgres compatible syntax.

**Column Restrictions:** \
Id column is required. \
Id column must not be a key. \
Column name `repository_id` is reserved.

```js
const storage = new Storage('my-datasource');
storage.ensureTable({
    id: 'INTEGER NOT NULL',
    param1: 'VARCHAR(255)',
    param2: 'VARCHAR(255)',
});
```

#### `createSnapshot(repo)`

What should happen when a snapshot is created, which data is fetched from
the [GitLab REST API](https://docs.gitlab.com/ee/api/api_resources.html) or 
the [GitLab GraphQL API](https://docs.gitlab.com/ee/api/graphql/) and how should it be
filtered/preprocessed?
Firstly, it needs to be chosen of which of the two APIs the data should be fetched from.

##### GitLab REST API

With the [GitLab REST API](https://docs.gitlab.com/ee/api/api_resources.html) an endpoint needs 
to be chosen. For repositories project id the shortcut `:id` can be used, and it will be replaced 
with the correct id. The previously initialized dynamic tables need to be filled with the data by 
utilizing the class Storage again:

```js
const api = repo.api();
const {data: repoDetails} = await api.fetch(`/projects/:id`);

// Filter data
const records = [repoDetails].map(
    ({id, param1, param2}) =>
        ({id, param1, param2}));

const storage = new Storage('my-datasource');
await storage.insertRecords(repo, records);
```

##### GitLab GraphQL API

When needing data from the [GitLab GraphQL API](https://docs.gitlab.com/ee/api/graphql/) the function `queryALL needs +
to be called. It initially requires a document, the GraphQL query, an extractor function.

The GraphQL `document` passed to `queryAll` must include the variables `$endCursor` for pagination and 
`$projectId` to specify the target resource (e.g., a project), it will be replaced with the correct id.
These variables allow the query to dynamically fetch data in pages by updating the `after` parameter with
the `endCursor` from the previous response. Pagination fields (`pageInfo { hasNextPage, endCursor }`) must
also be part of the query to support iterative fetching.

The extractor function processes the raw GraphQL response, extracting the `nodes` (data items) and the 
pageInfo (pagination information like `hasNextPage` and `endCursor`) needed for handling pagination. 

The mapNode function reformats the data from GraphQL’s response into a simpler structure suitable for storage.

A full example:

```js
async createSnapshot(repo) {
  function mapNode( node ) {
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
  const records = await api.queryAll( gql`
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
      }`,
    page => ({
      nodes: page.project.timelogs.nodes.map(mapNode),
      pageInfo: page.project.timelogs.pageInfo
    })
  );
  
  const storage = new Storage('timelogs');
  await storage.insertRecords(repo, records);
}
```


#### `getSingleById(repo, endpoint, id)` / `getAll()`

The methods defining the retrieval of a single datasource entry/all datasource entries from the database can be
overwritten as well, but is not recommended.

### How to use the Storage API

The class Storage is acting as an API managing the access to the methods handling the dynamic tables and offering it to
the datasource classes. If a datasource needs to be accessed the name of the datasource is given to the Storage class at
instantiation `Storage('datasource')` and any access to its stored data is to bed done through this created object.

#### `ensureTable( columns )`

The method ensures that the given columns are valid and are being created if they don't exist already.
The columns need to be given in Postgres compatible syntax:

```js
id: 'INTEGER NOT NULL',
    param1
:
'VARCHAR(255)',
    param2
:
'VARCHAR(255)',
```

**Column Restrictions:** \
Id column is required. \
Id column must not be a key. \
Column name `repository_id` is reserved.

The reason for these restrictions is that a composite primary key is created from the id column and the Repository Id,
so
for each repository a unique dynamic table with the datasource data can be created.

#### `clear(repo)`

#### `insertRecords(repo, records)`

#### `getRecordById(repo, id)`

#### `getAllRecords(repo)`

These methods manage access to the tables and should be self-explanatory.

### How to request data from the Service as a visualization

_todo_

## Endpoints

The api bridge service only has protected endpoints, as they only serve data for internal services.

_Datasources:_
For each datasource the following two endpoints get generated automatically. How a new one can be created is described
in [How to create a new datasource](#how-to-create-a-new-datasource)

### (API) `GET` /bridge/:uuid/\<datasource>

Get all data entries for the defined datasource for the given repository.

Path parameters:

- `uuid` UUID of the repository

### (API) `GET` /bridge/:uuid/\<datasource>/:id

Get the given entry for the defined a datasource for the given repository.

Path parameters:

- `uuid` UUID of the repository
- `:id`

---

### (API) `GET` /repository

Get basic information of all repositories.

### (Protected) `POST` /repository

Add a new repository.

JSON Body:

```json
{
  "name": "SampleGitLabRepo1",
  "uuid": "d9428887-e9f9-4b4d-bf4f-d8d26f34a9c1",
  "type": "gitlab",
  "url": "https://reset.inso.tuwien.ac.at/repo/2024ws-ase-pr-group/24ws-ase-pr-qse-07",
  "authToken": "glpat-sDqXSTfZsuXer5Bbzmaz"
}
```

### (API) `GET` /repository/:uuid

Get basic information of the given repository.

Path parameters:

- `uuid` UUID of the repository

Example response:

```json
{
  "name": "SampleGitLabRepo1",
  "uuid": "d9428887-e9f9-4b4d-bf4f-d8d26f34a9c1",
  "type": "gitlab",
  "url": "https://reset.inso.tuwien.ac.at/repo/2024ws-ase-pr-group/24ws-ase-pr-qse-07",
  "authToken": "glpat-sDqXSTfZsuXer5Bbzmaz"
}
```

### (API) `DELETE` /repository/:uuid

Delete the given repository.

Path parameters:

- `uuid` UUID of the repository

### (API) `PUT` /repository/:uuid

Update basic information of the given repository.

Path parameters:

- `uuid` UUID of the repository

JSON Body:

```json
{
  "name": "SampleGitLabRepo1",
  "type": "gitlab",
  "url": "https://reset.inso.tuwien.ac.at/repo/2024ws-ase-pr-group/24ws-ase-pr-qse-07",
  "authToken": "glpat-sDqXSTfZsuXer5Bbzmaz"
}
```

---

### (API) `POST` /snapshot/:uuid

Initiate the creation of a snapshot for the given repository.

Path parameters:

- `uuid` UUID of the repository

### (API) `POST` /snapshot/all (TBD)

Initiate the creation of a snapshot for all repositories.

Path parameters:

- `uuid` UUID of the repository

## Classes

### `ApiBridge`

ApiBridge is a Singleton that handles access to the Repositories in the Postgres database, acting as a Cache. It
further registers the defined datasources, adding their REST endpoints to the router. Snapshots are coordinated through
this class, clearing and creating new snapshots for a single repository for all datasources.

### `GitLabAPI`

GitLabAPI is the interface between the api bridge service and
the [GitLab REST API](https://docs.gitlab.com/ee/api/api_resources.html). It handles requests to fetch data
from the [GitLab REST API](https://docs.gitlab.com/ee/api/api_resources.html).

### `Storage`

The class Storage is acting as an interface between the methods handling the dynamic tables and the datasource classes.
It validates the given columns definitions for new tables and manages access to the tables.

### `Repository`

Repository encapsulates the basic information of a repository needed in the api bridge service for fetching further data
from the [GitLab REST API](https://docs.gitlab.com/ee/api/api_resources.html).

### `DataSource`

The DataSource class serves as an interface for any datasources being added.

