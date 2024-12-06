

CREATE TABLE IF NOT EXISTS repository (
  id SERIAL NOT NULL PRIMARY KEY,
  uuid UUID NOT NULL UNIQUE,
  name varchar(100) NOT NULL,
  git_url varchar(255) NOT NULL,
  type varchar(50) NOT NULL,
  auth_token VARCHAR(100) NOT NULL
);


CREATE TABLE IF NOT EXISTS contributor (
  id SERIAL NOT NULL PRIMARY KEY,
  uuid UUID NOT NULL UNIQUE,
  email varchar(255) NOT NULL,
  repository_id integer NOT NULL REFERENCES repository ON DELETE CASCADE,
  UNIQUE (email, repository_id)
);

CREATE TABLE IF NOT EXISTS repo_snapshot (
  id SERIAL NOT NULL PRIMARY KEY,
  repository_id integer NOT NULL REFERENCES repository ON DELETE CASCADE,
  creation_start_time TIMESTAMP NOT NULL,
  creation_end_time TIMESTAMP,
  UNIQUE (creation_start_time, repository_id)
);

CREATE TABLE IF NOT EXISTS branch_snapshot (
  id SERIAL NOT NULL PRIMARY KEY,
  uuid UUID NOT NULL UNIQUE,
  name varchar(255),
  repo_snapshot_id integer NOT NULL REFERENCES repo_snapshot ON DELETE CASCADE,
  commit_count integer NOT NULL,
  UNIQUE(name, repo_snapshot_id)
);

CREATE TABLE IF NOT EXISTS git_commit (
  id SERIAL NOT NULL PRIMARY KEY,
  hash char(40) NOT NULL UNIQUE,
  time TIMESTAMP NOT NULL,
  contributor_id integer REFERENCES contributor ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS branch_commit_list (
  branch_snapshot_id integer NOT NULL REFERENCES branch_snapshot ON DELETE CASCADE,
  commit_id integer REFERENCES git_commit ON DELETE SET NULL,
  commit_index integer NOT NULL,
  PRIMARY KEY ( branch_snapshot_id, commit_id )
);

CREATE TABLE IF NOT EXISTS src_file (
  id SERIAL NOT NULL PRIMARY KEY,
  path text NOT NULL,
  type varchar(50)
);

CREATE TABLE IF NOT EXISTS commit_changes (
  id SERIAL NOT NULL PRIMARY KEY,
  spans text,
  addition_count integer NOT NULL,
  deletion_count integer NOT NULL,
  commit_id integer REFERENCES git_commit ON DELETE CASCADE,
  src_file_id integer REFERENCES src_file ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS blame (
  id SERIAL NOT NULL PRIMARY KEY,
  branch_snapshot_id integer NOT NULL REFERENCES branch_snapshot ON DELETE CASCADE,
  contributor_id integer REFERENCES contributor ON DELETE SET NULL,
  src_file_id integer REFERENCES src_file ON DELETE SET null,
  spans text,
  line_count integer
);
