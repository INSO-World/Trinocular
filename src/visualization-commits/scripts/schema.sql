CREATE TABLE IF NOT EXISTS commit_stats (
  id SERIAL PRIMARY KEY,
  uuid UUID NOT NULL,
  branch_name VARCHAR(255) NOT NULL,
  contributor_email VARCHAR(255),
  commit_date DATE NOT NULL,
  commit_count INTEGER,
  CONSTRAINT unique_uuid_branch_contributor_date UNIQUE (uuid, branch_name, contributor_email, commit_date)
);
