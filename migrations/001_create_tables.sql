-- WIC Benefits Database Schema
-- This script creates the complete database schema for the WIC Benefits application
-- Generated from Prisma migrations on 2025-01-28
-- 
-- NOTE: If you have existing Prisma tables with camelCase columns,
-- run 000_convert_camelcase_to_snake_case.sql FIRST to convert them

-- Enable UUID generation (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create participants table
CREATE TABLE IF NOT EXISTS participants (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    participant_id TEXT NOT NULL UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT,
    date_of_birth TIMESTAMPTZ,
    home_address TEXT,
    mailing_address TEXT,
    mobile_number TEXT,
    can_receive_texts BOOLEAN NOT NULL DEFAULT false,
    preferred_language TEXT NOT NULL DEFAULT 'English',
    email TEXT,
    benefits_receiving TEXT,
    on_probation BOOLEAN,
    is_veteran BOOLEAN,
    relationship_status TEXT,
    sex_at_birth TEXT,
    gender_identity TEXT,
    ethnicity TEXT,
    race TEXT,
    has_medi_cal BOOLEAN NOT NULL DEFAULT false,
    medi_cal_case_number TEXT,
    medi_cal_amount DECIMAL(10,2),
    is_pregnant BOOLEAN,
    is_post_partum BOOLEAN,
    is_infant_breastfeeding BOOLEAN,
    is_infant_formula BOOLEAN,
    has_children0to5 BOOLEAN,
    has_dependents BOOLEAN,
    monthly_income DECIMAL(10,2),
    occupation TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create household_dependents table
CREATE TABLE IF NOT EXISTS household_dependents (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    participant_id TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT,
    age INTEGER,
    date_of_birth TIMESTAMPTZ,
    relationship TEXT,
    sex_at_birth TEXT,
    gender_identity TEXT,
    ethnicity TEXT,
    race TEXT,
    is_infant BOOLEAN,
    is_child0to5 BOOLEAN,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT household_dependents_participant_id_fkey 
        FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create mastra_artifacts table for Playwright artifacts
CREATE TABLE IF NOT EXISTS mastra_artifacts (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    session_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    content BYTEA NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    trace_id TEXT,
    thread_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for participants table
CREATE INDEX IF NOT EXISTS participants_participant_id_idx ON participants(participant_id);
CREATE INDEX IF NOT EXISTS participants_first_name_idx ON participants(first_name);
CREATE INDEX IF NOT EXISTS participants_last_name_idx ON participants(last_name);
CREATE INDEX IF NOT EXISTS participants_created_at_idx ON participants(created_at);

-- Create indexes for household_dependents table
CREATE INDEX IF NOT EXISTS household_dependents_participant_id_idx ON household_dependents(participant_id);
CREATE INDEX IF NOT EXISTS household_dependents_first_name_idx ON household_dependents(first_name);
CREATE INDEX IF NOT EXISTS household_dependents_created_at_idx ON household_dependents(created_at);

-- Create indexes for mastra_artifacts table
CREATE INDEX IF NOT EXISTS mastra_artifacts_session_id_idx ON mastra_artifacts(session_id);
CREATE INDEX IF NOT EXISTS mastra_artifacts_file_type_idx ON mastra_artifacts(file_type);
CREATE INDEX IF NOT EXISTS mastra_artifacts_trace_id_idx ON mastra_artifacts(trace_id);
CREATE INDEX IF NOT EXISTS mastra_artifacts_created_at_idx ON mastra_artifacts(created_at);

-- Create function to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at timestamps
DROP TRIGGER IF EXISTS update_participants_updated_at ON participants;
CREATE TRIGGER update_participants_updated_at
    BEFORE UPDATE ON participants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_household_dependents_updated_at ON household_dependents;
CREATE TRIGGER update_household_dependents_updated_at
    BEFORE UPDATE ON household_dependents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_mastra_artifacts_updated_at ON mastra_artifacts;
CREATE TRIGGER update_mastra_artifacts_updated_at
    BEFORE UPDATE ON mastra_artifacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert a comment to track migration version
COMMENT ON DATABASE CURRENT_DATABASE() IS 'WIC Benefits DB - Schema version 001 - Created from Prisma migrations';
