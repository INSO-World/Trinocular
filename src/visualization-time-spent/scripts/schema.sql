-- DROP TABLE IF EXISTS issue;

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

CREATE TABLE IF NOT EXISTS repo_details (
  id SERIAL NOT NULL PRIMARY KEY,
  uuid UUID UNIQUE NOT NULL,
  created_at DATE NOT NULL,
  closed_at DATE
);
