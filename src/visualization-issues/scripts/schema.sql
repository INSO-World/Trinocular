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

CREATE TABLE IF NOT EXISTS issue (
  id SERIAL PRIMARY KEY,
  project_id INT NOT NULL,
  uuid UUID NOT NULL,
  title TEXT NOT NULL,
  labels TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL,
  closed_at TIMESTAMPTZ DEFAULT NOW(),
  human_total_time_spent VARCHAR(20) DEFAULT 0,
  time_estimate INT DEFAULT 0,
  CONSTRAINT unique_uuid_project_id UNIQUE (uuid, project_id)
);
