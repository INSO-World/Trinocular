-- DROP TABLE IF EXISTS timelog;

CREATE TABLE IF NOT EXISTS issue (
  id SERIAL NOT NULL PRIMARY KEY,
  uuid UUID NOT NULL,
  iid INT NOT NULL,
  title varchar(100) NOT NULL,
  created_at TIMESTAMP NOT NULL,
  closed_at TIMESTAMP,
  total_time_spent INT NOT NULL,
  CONSTRAINT unique_uuid_iid UNIQUE (uuid, iid)
);

CREATE TABLE IF NOT EXISTS timelog (
  id SERIAL NOT NULL PRIMARY KEY,
  uuid UUID NOT NULL,
  time_spent INTEGER NOT NULL,
  spent_at TIMESTAMPTZ NOT NULL,
  user_id INT NOT NULL,
  issue_iid INT,
  merge_request_iid INT,
  CONSTRAINT unique_uuid_user_id_spent_at UNIQUE (uuid, user_id, spent_at)
);

CREATE TABLE IF NOT EXISTS member (
  id INTEGER NOT NULL,
  uuid UUID NOT NULL,
  username varchar(100) NOT NULL,
  name varchar(100),
  email varchar(100),
  CONSTRAINT unique_uuid_id UNIQUE (uuid, id)
);

CREATE TABLE IF NOT EXISTS repo_details (
  id SERIAL NOT NULL PRIMARY KEY,
  uuid UUID UNIQUE NOT NULL,
  created_at DATE NOT NULL,
  updated_at DATE
);
