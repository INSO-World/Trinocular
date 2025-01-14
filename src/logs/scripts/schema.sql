
-- Define the table with the same schema as Fluentbit would
CREATE TABLE IF NOT EXISTS fluentbit (
	tag varchar NULL,
	"time" timestamp NULL,
	"data" jsonb NULL
);

-- Add an index on tags so that sorting by service name is more efficient
CREATE INDEX IF NOT EXISTS logs_tag_index ON fluentbit (tag);
