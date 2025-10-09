-- Add APRICOT360 CSV-specific fields to participants table
-- Migration: 005_add_apricot360_csv_fields.sql

BEGIN;

-- File and referral tracking
ALTER TABLE participants ADD COLUMN IF NOT EXISTS file_open_date TIMESTAMPTZ;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS dpss_referral_date TIMESTAMPTZ;

-- Consent tracking
ALTER TABLE participants ADD COLUMN IF NOT EXISTS consent_provided BOOLEAN;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS consent_date TIMESTAMPTZ;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS consent_expiration_date TIMESTAMPTZ;

-- Employment and special needs
ALTER TABLE participants ADD COLUMN IF NOT EXISTS is_farm_worker BOOLEAN;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS special_needs BOOLEAN;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS special_needs_notes TEXT;

-- Contact preferences
ALTER TABLE participants ADD COLUMN IF NOT EXISTS do_not_contact BOOLEAN DEFAULT false;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS home_phone TEXT;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS work_phone TEXT;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS main_phone TEXT;

-- Notes and metadata
ALTER TABLE participants ADD COLUMN IF NOT EXISTS participant_notes TEXT;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS funding_source TEXT;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS age_at_file_open INTEGER;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS year_of_birth INTEGER;

-- Enhanced address fields
ALTER TABLE participants ADD COLUMN IF NOT EXISTS address_line2 TEXT;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS address_city TEXT;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS address_state TEXT;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS address_zip TEXT;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS address_county TEXT;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS address_country TEXT;

-- Separate mailing address
ALTER TABLE participants ADD COLUMN IF NOT EXISTS mailing_address_line1 TEXT;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS mailing_address_line2 TEXT;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS mailing_address_city TEXT;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS mailing_address_state TEXT;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS mailing_address_zip TEXT;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS mailing_address_county TEXT;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS mailing_address_country TEXT;

-- Create indexes for frequently queried fields
CREATE INDEX IF NOT EXISTS participants_file_open_date_idx ON participants(file_open_date);
CREATE INDEX IF NOT EXISTS participants_dpss_referral_date_idx ON participants(dpss_referral_date);
CREATE INDEX IF NOT EXISTS participants_consent_expiration_date_idx ON participants(consent_expiration_date);
CREATE INDEX IF NOT EXISTS participants_is_farm_worker_idx ON participants(is_farm_worker);
CREATE INDEX IF NOT EXISTS participants_do_not_contact_idx ON participants(do_not_contact);
CREATE INDEX IF NOT EXISTS participants_address_city_idx ON participants(address_city);
CREATE INDEX IF NOT EXISTS participants_address_zip_idx ON participants(address_zip);
CREATE INDEX IF NOT EXISTS participants_funding_source_idx ON participants(funding_source);

-- Add comments for documentation
COMMENT ON COLUMN participants.file_open_date IS 'Date when the participant file was opened in APRICOT360';
COMMENT ON COLUMN participants.dpss_referral_date IS 'Date when participant was referred by DPSS';
COMMENT ON COLUMN participants.consent_provided IS 'Whether participant provided verbal consent to complete intake';
COMMENT ON COLUMN participants.consent_date IS 'Date when consent form was signed';
COMMENT ON COLUMN participants.consent_expiration_date IS 'Date when consent expires (typically 10 years from consent date)';
COMMENT ON COLUMN participants.is_farm_worker IS 'Whether participant is a farm worker';
COMMENT ON COLUMN participants.special_needs IS 'Whether participant has special needs requiring accommodation';
COMMENT ON COLUMN participants.special_needs_notes IS 'Details about special needs';
COMMENT ON COLUMN participants.do_not_contact IS 'Flag indicating participant does not want to be contacted';
COMMENT ON COLUMN participants.home_phone IS 'Home phone number';
COMMENT ON COLUMN participants.work_phone IS 'Work phone number';
COMMENT ON COLUMN participants.main_phone IS 'Primary/main phone number';
COMMENT ON COLUMN participants.participant_notes IS 'General notes about the participant';
COMMENT ON COLUMN participants.funding_source IS 'Funding source for services';
COMMENT ON COLUMN participants.age_at_file_open IS 'Participant age when file was opened';
COMMENT ON COLUMN participants.year_of_birth IS 'Year of birth (may be approximate if full DOB unknown)';

-- Add household_dependents enhancements
ALTER TABLE household_dependents ADD COLUMN IF NOT EXISTS associated_family TEXT;

COMMENT ON COLUMN household_dependents.associated_family IS 'Family role from APRICOT360 (e.g., Mother, Son, Daughter)';

COMMIT;

