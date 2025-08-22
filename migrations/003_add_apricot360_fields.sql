-- Add APRICOT360-specific fields to participants table
-- Migration: 003_add_apricot360_fields.sql

-- Add CalWorks ID field (dedicated field instead of storing in benefits_receiving)
ALTER TABLE participants ADD COLUMN IF NOT EXISTS calworks_id TEXT;

-- Add preferred contact method field
ALTER TABLE participants ADD COLUMN IF NOT EXISTS preferred_contact_method TEXT;

-- Add expectant mother in home field (useful for WIC eligibility)
ALTER TABLE participants ADD COLUMN IF NOT EXISTS expectant_mother_in_home BOOLEAN;

-- Add participant type field (from APRICOT360 "Type" field)
ALTER TABLE participants ADD COLUMN IF NOT EXISTS participant_type TEXT;

-- Create indexes for the new fields
CREATE INDEX IF NOT EXISTS participants_calworks_id_idx ON participants(calworks_id);
CREATE INDEX IF NOT EXISTS participants_preferred_contact_method_idx ON participants(preferred_contact_method);
CREATE INDEX IF NOT EXISTS participants_expectant_mother_in_home_idx ON participants(expectant_mother_in_home);
CREATE INDEX IF NOT EXISTS participants_participant_type_idx ON participants(participant_type);

-- Add comment explaining the new fields
COMMENT ON COLUMN participants.calworks_id IS 'CalWorks ID from APRICOT360 system';
COMMENT ON COLUMN participants.preferred_contact_method IS 'Preferred method of contact: Email, Phone, Text';
COMMENT ON COLUMN participants.expectant_mother_in_home IS 'Whether there is an expectant mother in the home (from APRICOT360)';
COMMENT ON COLUMN participants.participant_type IS 'Participant type/role from APRICOT360 (e.g., Other adult, Other caregiver)';
