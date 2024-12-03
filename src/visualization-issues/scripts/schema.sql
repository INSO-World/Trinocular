CREATE TABLE IF NOT EXISTS issue (
  id SERIAL NOT NULL PRIMARY KEY,
  uuid UUID NOT NULL,
  date TIMESTAMP NOT NULL,
  open_issues INT NOT NULL,
  total_time_spent JSON NOT NULL,
  open_issues_info JSON NOT NULL,
  CONSTRAINT unique_uuid_date UNIQUE (uuid, date)
);


-- CREATE TABLE IF NOT EXISTS milestone (
--   id SERIAL NOT NULL PRIMARY KEY,
--   uuid UUID NOT NULL UNIQUE
-- );
