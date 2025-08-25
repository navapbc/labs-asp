-- Fix mastra_artifacts table UUID generation issue
-- Remove dependency on pgcrypto extension by removing DEFAULT clause
-- Application will now generate UUIDs directly using Node.js crypto.randomUUID()

-- Remove the default constraint that depends on gen_random_uuid()
ALTER TABLE mastra_artifacts ALTER COLUMN id DROP DEFAULT;

-- Add a comment to track this migration
COMMENT ON TABLE mastra_artifacts IS 'Updated to remove pgcrypto dependency - UUIDs generated in application code';
