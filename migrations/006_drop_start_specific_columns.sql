-- Drop START-specific columns and align schema with APRICOT360
-- Migration: 006_drop_start_specific_columns.sql
--
-- This migration:
-- 1. Removes columns that were only used by the START datasource
-- 2. Renames columns to match APRICOT360 terminology
-- 3. Adds new APRICOT360-specific columns
--
-- COLUMNS BEING DROPPED from participants:
-- - benefits_receiving: not used in APRICOT360
-- - on_probation: not used in APRICOT360
-- - is_veteran: not used in APRICOT360
-- - medi_cal_case_number: not used in APRICOT360
-- - medi_cal_amount: not used in APRICOT360
-- - occupation: not used in APRICOT360
-- - can_receive_texts: not used in APRICOT360
-- - has_medi_cal: not used in APRICOT360
-- - is_pregnant: not used in APRICOT360
-- - is_post_partum: not used in APRICOT360
-- - is_infant_breastfeeding: not used in APRICOT360
-- - is_infant_formula: not used in APRICOT360
-- - has_children0to5: not used in APRICOT360
-- - monthly_income: not used in APRICOT360
-- - home_address: retiring in favor of structured address fields
-- - mailing_address: retiring in favor of structured mailing_address_* fields
--
-- COLUMNS BEING RENAMED in participants:
-- - preferred_language → primary_language
-- - race → ethnicity (note: race already exists but will be dropped, ethnicity already exists)
-- - sex_at_birth → gender (note: gender_identity already exists)
--
-- COLUMNS BEING ADDED to participants:
-- - other_financial_assistance: TEXT (no data in current CSV, will be NULL)
-- - ssi_ssp: TEXT (no data in current CSV, will be NULL)
-- - primary_family_name_first: TEXT (from CSV 'Name of primary family member (First)')
-- - primary_family_name_last: TEXT (from CSV 'Name of primary family member (Last)')
-- - primary_family_name_middle: TEXT (from CSV 'Name of primary family member (Middle)')
-- - family_participant_type: TEXT (no data in current CSV, will be NULL)
--
-- COLUMNS BEING DROPPED from household_dependents:
-- (none additional beyond what was already planned)

BEGIN;

-- =============================================================================
-- STEP 1: DROP START-SPECIFIC COLUMNS FROM PARTICIPANTS
-- =============================================================================

-- Original columns to drop
ALTER TABLE participants DROP COLUMN IF EXISTS benefits_receiving;
ALTER TABLE participants DROP COLUMN IF EXISTS on_probation;
ALTER TABLE participants DROP COLUMN IF EXISTS is_veteran;
ALTER TABLE participants DROP COLUMN IF EXISTS medi_cal_case_number;
ALTER TABLE participants DROP COLUMN IF EXISTS medi_cal_amount;
ALTER TABLE participants DROP COLUMN IF EXISTS occupation;

-- Additional columns to drop per PM request
ALTER TABLE participants DROP COLUMN IF EXISTS can_receive_texts;
ALTER TABLE participants DROP COLUMN IF EXISTS has_medi_cal;
ALTER TABLE participants DROP COLUMN IF EXISTS is_pregnant;
ALTER TABLE participants DROP COLUMN IF EXISTS is_post_partum;
ALTER TABLE participants DROP COLUMN IF EXISTS is_infant_breastfeeding;
ALTER TABLE participants DROP COLUMN IF EXISTS is_infant_formula;
ALTER TABLE participants DROP COLUMN IF EXISTS has_children0to5;
ALTER TABLE participants DROP COLUMN IF EXISTS monthly_income;

-- Drop old address columns (replaced by structured address fields in migration 005)
ALTER TABLE participants DROP COLUMN IF EXISTS home_address;
ALTER TABLE participants DROP COLUMN IF EXISTS mailing_address;

-- Drop race column (keeping ethnicity which already exists)
ALTER TABLE participants DROP COLUMN IF EXISTS race;

-- =============================================================================
-- STEP 2: RENAME COLUMNS IN PARTICIPANTS
-- =============================================================================

-- Rename preferred_language to primary_language
ALTER TABLE participants RENAME COLUMN preferred_language TO primary_language;

-- Rename sex_at_birth to gender
-- Note: gender_identity already exists, so we're renaming sex_at_birth to gender
ALTER TABLE participants RENAME COLUMN sex_at_birth TO gender;

-- =============================================================================
-- STEP 3: ADD NEW APRICOT360 COLUMNS TO PARTICIPANTS
-- =============================================================================

-- Missing address field from migration 005
ALTER TABLE participants ADD COLUMN IF NOT EXISTS address_line1 TEXT;

-- Financial assistance fields
ALTER TABLE participants ADD COLUMN IF NOT EXISTS other_financial_assistance TEXT;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS ssi_ssp TEXT;

-- Primary family contact fields
ALTER TABLE participants ADD COLUMN IF NOT EXISTS primary_family_name_first TEXT;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS primary_family_name_last TEXT;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS primary_family_name_middle TEXT;

-- Family relationship field
ALTER TABLE participants ADD COLUMN IF NOT EXISTS family_participant_type TEXT;

-- =============================================================================
-- STEP 4: DROP COLUMNS FROM HOUSEHOLD_DEPENDENTS
-- =============================================================================

-- Drop sex_at_birth (rename to gender to match participants)
ALTER TABLE household_dependents RENAME COLUMN sex_at_birth TO gender;

-- Drop race (ethnicity already exists)
ALTER TABLE household_dependents DROP COLUMN IF EXISTS race;

-- =============================================================================
-- STEP 5: ADD INDEXES FOR NEW COLUMNS
-- =============================================================================

CREATE INDEX IF NOT EXISTS participants_primary_language_idx ON participants(primary_language);
CREATE INDEX IF NOT EXISTS participants_gender_idx ON participants(gender);
CREATE INDEX IF NOT EXISTS participants_family_participant_type_idx ON participants(family_participant_type);
CREATE INDEX IF NOT EXISTS household_dependents_gender_idx ON household_dependents(gender);

-- =============================================================================
-- STEP 6: ADD COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON COLUMN participants.other_financial_assistance IS 'Other financial assistance programs participant is enrolled in';
COMMENT ON COLUMN participants.ssi_ssp IS 'SSI/SSP (Supplemental Security Income/State Supplementary Payment) information';
COMMENT ON COLUMN participants.primary_family_name_first IS 'First name of primary family contact';
COMMENT ON COLUMN participants.primary_family_name_last IS 'Last name of primary family contact';
COMMENT ON COLUMN participants.primary_family_name_middle IS 'Middle name of primary family contact';
COMMENT ON COLUMN participants.family_participant_type IS 'Type/role of participant within family structure';
COMMENT ON COLUMN participants.primary_language IS 'Primary language spoken by participant';
COMMENT ON COLUMN participants.gender IS 'Gender of participant';

COMMENT ON TABLE participants IS 'Participants table - cleaned up to APRICOT360 schema (migration 006)';
COMMENT ON TABLE household_dependents IS 'Household dependents table - cleaned up to APRICOT360 schema (migration 006)';

COMMIT;
