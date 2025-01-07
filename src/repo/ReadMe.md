
# Repo Service

## Description

The Repo (Repository) Service manages tasks related to Git repository data. It retrieves repositories from remote locations using a URL and access token, then stores them locally in the system's volume. By using the simple-git library, the service accesses repository data and later processes it before saving it into a PostgreSQL database. 

The service also supports creating snapshots of repositories and their branches via its API. This functionality is regularly triggered by the Scheduler Service, to fetch the latest data for ingestion. The processed repository data is made accessible through the API for other system components, such as visualization services. The Repo Service also caches the repository data at startup and updates it whenever a new snapshot is created.

## Dockerfile

The Repo Service is a standard Node.js application built on an Alpine Linux base image. It includes Git as an additional software component. A dedicated volume is mounted to ensure persistent storage of Git repositories. The Repo Service relies on the Postgres Service hosting a postgreSQL database, as it requires access to the DB for its operations.

## DB Structure
``` mermaid
erDiagram
    REPOSITORY {
        INT id PK
        UUID uuid UK
        VARCHAR name
        VARCHAR git_url
        VARCHAR type
    }
    CONTRIBUTOR {
        INT id PK
        UUID uuid UK
        VARCHAR email
        INT repository_id FK
        unique unique_key "(email, repository_id)"
    }
    REPO_SNAPSHOT {
        INT id PK
        TIMESTAMP created
        INT repository_id FK
        TIMESTAMP creation_start_time
        TIMESTAMP creation_end_time
        unique unique_key "(created, repository_id)"
    }
    BRANCH_SNAPSHOT {
        INT id PK
        UUID uuid UK
        VARCHAR name
        INT repo_snapshot_id FK
        INT commit_count
    }
    GIT_COMMIT {
        INT id PK
        CHAR hash UK
        TIMESTAMP time
        INT contributor_id FK
    }
    BRANCH_COMMIT_LIST {
        INT branch_snapshot_id FK
        INT commit_id FK
        INT commit_index
        primary primary_key "(branch_snapshot_id, commit_id)"
    }
    SRC_FILE {
        INT id PK
        TEXT path
        VARCHAR type
    }
    COMMIT_CHANGES {
        INT id PK
        TEXT spans
        INT addition_count
        INT deletion_count
        INT commit_id FK
        INT src_file_id FK
    }
    BLAME {
        INT id PK
        INT branch_snapshot_id FK
        INT contributor_id FK
        INT src_file_id FK
        TEXT spans
        INT line_count
    }

    REPOSITORY ||--o{ CONTRIBUTOR : ""
    REPOSITORY ||--o{ REPO_SNAPSHOT : ""
    REPO_SNAPSHOT ||--o{ BRANCH_SNAPSHOT : ""
    BRANCH_SNAPSHOT ||--o{ BRANCH_COMMIT_LIST : ""
    GIT_COMMIT ||--o{ BRANCH_COMMIT_LIST : ""
    CONTRIBUTOR ||--o{ GIT_COMMIT : ""
    GIT_COMMIT ||--o{ COMMIT_CHANGES : ""
    SRC_FILE ||--o{ COMMIT_CHANGES : ""
    SRC_FILE ||--o{ BLAME : ""
    BRANCH_SNAPSHOT ||--o{ BLAME : ""
    CONTRIBUTOR ||--o{ BLAME : ""
```

## Workflow: Create Snapshot

1. Force Pull Remote Repository
   1. Perform a force pull for the remote repository to ensure all local changes are discarded, resulting in an exact copy of the remote version.
   2. Repeat this process for all branches of the repository.

2. Update Repository
   1. Retrieve repository metadata and update the cached Repository Object.
   2. Extract contributors from Git and add them to the Repository Object.
   3. Persist the updated Repository Object to the database.

3. Add Commits to Database
   1. Add new commits and associated metadata to the database.

4. Create Repository Snapshot
   1. Generate a snapshot of the repository.

5. Create Branch Snapshots
   1. Generate snapshots for each branch.


## Endpoints

All endpoints are api secured.

### (API) `GET` /repository/:uuid
Get a repository by its uuid.

Path parameters:
- `uuid` UUID of the repository

### (API) `POST` /repository/:uuid

Creates a new repository in our system. The repository is cached and also persisted in the DB. Only stores rudimentary data including name, type, uuid and GitURL

Path parameters:
- `uuid` UUID of the repository

JSON Body:
```json
{
  "name": "24ws-ase-pr-qse-07",
  "type": "gitlab",
  "GitUrl": "https://reset.inso.tuwien.ac.at/repo/2024ws-ase-pr-group/24ws-ase-pr-qse-07.git",
   "authToken": "repo-auth-token-1"
}
```

### (API) `PUT` /repository/:uuid

Update information of an existing repository.

Path parameters:
- `uuid` UUID of the repository

JSON Body:
```json
{
  "name": "24ws-ase-pr-qse-07",
  "type": "gitlab",
  "GitUrl": "https://reset.inso.tuwien.ac.at/repo/2024ws-ase-pr-group/24ws-ase-pr-qse-07.git",
   "authToken": "repo-auth-token-1"
}
```

### (API) `DELETE` /repository/:uuid

Delete an existing repository. Deletes it from the cache, DB and its local files in the volume.

Path parameters:
- `uuid` UUID of the repository


### (API) `POST` /snapshot/:uuid

Creates a snapshot of the repository version currently on the remote origin. See further details in section *`Workflow: Create Snapshot`*.

Path parameters:
- `uuid` UUID of the repository

Query parameters:
- `transactionId` Transaction ID for callback


## Classes

### `Repository`
 ``` js
/** 
 * Constructor
 * @param {string} name
 * @param {number} dbId
 * @param {string} uuid
 * @param {string} gitUrl
 * @param {string} type
 * @param {Contributor[]?} contributors
 * @param {string?} authToken
 */
```
### `Contributor`
 ``` js
/** 
 * Constructor
 * @param {string} email
 * @param {number} dbId
 * @param {string} uuid
 */
```
