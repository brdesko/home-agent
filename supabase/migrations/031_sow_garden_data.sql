-- Drop existing table if it has wrong schema
  DROP TABLE IF EXISTS garden_data;

  -- Recreate with correct schema
  CREATE TABLE garden_data (
    id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    lattice_id  UUID        NOT NULL REFERENCES lattices(id) ON DELETE
  CASCADE,
    data        JSONB       NOT NULL DEFAULT '{}',
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT garden_data_lattice_unique UNIQUE (lattice_id)
  );

  ALTER TABLE garden_data ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "Owner can manage garden data"
    ON garden_data
    FOR ALL
    USING (
      lattice_id IN (
        SELECT id FROM lattices WHERE owner_id = auth.uid()
      )
    );