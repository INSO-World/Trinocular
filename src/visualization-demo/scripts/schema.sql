-- TODO: Add Schema that describes the concrete data used in the visualization
-- This data should already be preprocessed if needed

CREATE TABLE IF NOT EXISTS demo (
  id SERIAL PRIMARY KEY,
  uuid UUID NOT NULL,
  date DATE NOT NULL,
  value INT NOT NULL,
--   Create unique constraints to avoid duplicates if new snapshot is done
  CONSTRAINT unique_uuid_date UNIQUE (uuid, date)
);
-- If applicable, create a hierarchical table structure to allow for cascading deletes
