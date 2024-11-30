

CREATE TABLE IF NOT EXISTS user (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid CHAR(36) UNIQUE
);

CREATE TABLE IF NOT EXISTS repository (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid CHAR(36) UNIQUE,
  name varchar(500),
  is_active INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS repository_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES user ON DELETE CASCADE,
  repo_id INTEGER NOT NULL REFERENCES repository ON DELETE CASCADE,
  color char(6),
  is_favorite INTEGER DEFAULT 0
);

-- Some dummy test data
-- DELETE FROM repository;
--INSERT INTO repository (id, uuid, name) VALUES
-- ( 0, 'abcdefghijklmnopqrstuvwxyzabcdefghi0', 'dummy-repo 0' ),
-- ( 1, 'abcdefghijklmnopqrstuvwxyzabcdefghi1', 'dummy-repo 1' ),
-- ( 2, 'abcdefghijklmnopqrstuvwxyzabcdefghi2', 'dummy-repo 2' ),
-- ( 3, 'abcdefghijklmnopqrstuvwxyzabcdefghi3', 'dummy-repo 3' );

