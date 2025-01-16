CREATE TABLE IF NOT EXISTS pipeline_daily_stats (
  id SERIAL PRIMARY KEY,
  uuid UUID NOT NULL,
  branch VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  success_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT unique_uuid_branch_date UNIQUE (uuid, branch, date)
);
