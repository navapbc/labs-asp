-- Add datasourcetype field to participants and household_dependents tables
-- This field will track the source system that created each record

BEGIN;

-- Add datasourcetype column to participants table
ALTER TABLE participants 
ADD COLUMN datasourcetype TEXT NOT NULL DEFAULT 'START';

-- Add datasourcetype column to household_dependents table
ALTER TABLE household_dependents 
ADD COLUMN datasourcetype TEXT NOT NULL DEFAULT 'START';

-- Update existing records to have 'START' as datasourcetype
-- (This is redundant due to the DEFAULT, but explicit for clarity)
UPDATE participants SET datasourcetype = 'START' WHERE datasourcetype IS NULL;
UPDATE household_dependents SET datasourcetype = 'START' WHERE datasourcetype IS NULL;

-- Create indexes for better query performance on datasourcetype
CREATE INDEX IF NOT EXISTS participants_datasourcetype_idx ON participants(datasourcetype);
CREATE INDEX IF NOT EXISTS household_dependents_datasourcetype_idx ON household_dependents(datasourcetype);

-- Add a comment to document the field
COMMENT ON COLUMN participants.datasourcetype IS 'Source system that created this participant record (e.g., START, APRICOT360)';
COMMENT ON COLUMN household_dependents.datasourcetype IS 'Source system that created this household dependent record (e.g., START, APRICOT360)';

COMMIT;
