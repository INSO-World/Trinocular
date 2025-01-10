CREATE TABLE IF NOT EXISTS issue_day (
  id SERIAL NOT NULL PRIMARY KEY,
  uuid UUID NOT NULL,
  date DATE NOT NULL,
  open_issues INT NOT NULL,
  open_issues_info JSON NOT NULL,
  CONSTRAINT unique_uuid_day UNIQUE (uuid, date)
);

CREATE TABLE IF NOT EXISTS issue_week (
  id SERIAL NOT NULL PRIMARY KEY,
  uuid UUID NOT NULL,
  date DATE NOT NULL,
  open_issues INT NOT NULL,
  open_issues_info JSON NOT NULL,
  CONSTRAINT unique_uuid_week UNIQUE (uuid, date)
);

CREATE TABLE IF NOT EXISTS issue_month (
  id SERIAL NOT NULL PRIMARY KEY,
  uuid UUID NOT NULL,
  date DATE NOT NULL,
  open_issues INT NOT NULL,
  open_issues_info JSON NOT NULL,
  CONSTRAINT unique_uuid_month UNIQUE (uuid, date)
);
