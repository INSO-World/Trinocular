CREATE TABLE IF NOT EXISTS repo_details (
  id SERIAL NOT NULL PRIMARY KEY,
  uuid UUID UNIQUE NOT NULL,
  created_at DATE NOT NULL,
  updated_at DATE
);

CREATE TABLE IF NOT EXISTS issue (
  id SERIAL NOT NULL PRIMARY KEY,
  uuid UUID NOT NULL,
  iid INT NOT NULL,
  title varchar(100) NOT NULL,
  created_at TIMESTAMP NOT NULL,
  closed_at TIMESTAMP,
  total_time_spent INT NOT NULL,
  CONSTRAINT unique_uuid_iid UNIQUE (uuid, iid),
  CONSTRAINT fk_issue_repo FOREIGN KEY (uuid) REFERENCES repo_details(uuid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS timelog (
  id INTEGER NOT NULL,
  uuid UUID NOT NULL,
  time_spent INTEGER NOT NULL,
  spent_at TIMESTAMPTZ NOT NULL,
  user_id INT NOT NULL,
  issue_iid INT,
  merge_request_iid INT,
  CONSTRAINT unique_timelog_uuid_id UNIQUE (uuid, id),
  CONSTRAINT fk_timelog_repo FOREIGN KEY (uuid) REFERENCES repo_details(uuid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS member (
  id INTEGER NOT NULL,
  uuid UUID NOT NULL,
  username varchar(100) NOT NULL,
  name varchar(100),
  email varchar(100),
  CONSTRAINT unique_uuid_id UNIQUE (uuid, id),
  CONSTRAINT fk_member_repo FOREIGN KEY (uuid) REFERENCES repo_details(uuid) ON DELETE CASCADE
);
