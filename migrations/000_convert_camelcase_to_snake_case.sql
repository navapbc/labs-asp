-- Migration to convert existing Prisma camelCase columns to snake_case
-- This script preserves all existing data while making the schema compatible with our new PostgreSQL-only code
-- Run this BEFORE running 001_create_tables.sql

-- Start transaction to ensure atomicity
BEGIN;

-- Check if we need to convert (if camelCase columns exist)
DO $$
DECLARE
    table_exists boolean;
    camel_case_exists boolean;
BEGIN
    -- Check if participants table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'participants'
    ) INTO table_exists;
    
    IF table_exists THEN
        -- Check if camelCase columns exist (indicating this is a Prisma-created table)
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'participants' 
            AND column_name = 'participantId'
        ) INTO camel_case_exists;
        
        IF camel_case_exists THEN
            RAISE NOTICE 'Converting participants table from camelCase to snake_case...';
            
            -- Rename columns in participants table
            ALTER TABLE participants RENAME COLUMN "participantId" TO participant_id;
            ALTER TABLE participants RENAME COLUMN "firstName" TO first_name;
            ALTER TABLE participants RENAME COLUMN "lastName" TO last_name;
            ALTER TABLE participants RENAME COLUMN "dateOfBirth" TO date_of_birth;
            ALTER TABLE participants RENAME COLUMN "homeAddress" TO home_address;
            ALTER TABLE participants RENAME COLUMN "mailingAddress" TO mailing_address;
            ALTER TABLE participants RENAME COLUMN "mobileNumber" TO mobile_number;
            ALTER TABLE participants RENAME COLUMN "canReceiveTexts" TO can_receive_texts;
            ALTER TABLE participants RENAME COLUMN "preferredLanguage" TO preferred_language;
            ALTER TABLE participants RENAME COLUMN "hasMediCal" TO has_medi_cal;
            ALTER TABLE participants RENAME COLUMN "mediCalCaseNumber" TO medi_cal_case_number;
            ALTER TABLE participants RENAME COLUMN "mediCalAmount" TO medi_cal_amount;
            ALTER TABLE participants RENAME COLUMN "isPregnant" TO is_pregnant;
            ALTER TABLE participants RENAME COLUMN "isPostPartum" TO is_post_partum;
            ALTER TABLE participants RENAME COLUMN "isInfantBreastfeeding" TO is_infant_breastfeeding;
            ALTER TABLE participants RENAME COLUMN "isInfantFormula" TO is_infant_formula;
            ALTER TABLE participants RENAME COLUMN "hasChildren0to5" TO has_children0to5;
            ALTER TABLE participants RENAME COLUMN "monthlyIncome" TO monthly_income;
            ALTER TABLE participants RENAME COLUMN "createdAt" TO created_at;
            ALTER TABLE participants RENAME COLUMN "updatedAt" TO updated_at;
            ALTER TABLE participants RENAME COLUMN "hasDependents" TO has_dependents;
            ALTER TABLE participants RENAME COLUMN "benefitsReceiving" TO benefits_receiving;
            ALTER TABLE participants RENAME COLUMN "genderIdentity" TO gender_identity;
            ALTER TABLE participants RENAME COLUMN "isVeteran" TO is_veteran;
            ALTER TABLE participants RENAME COLUMN "onProbation" TO on_probation;
            ALTER TABLE participants RENAME COLUMN "relationshipStatus" TO relationship_status;
            ALTER TABLE participants RENAME COLUMN "sexAtBirth" TO sex_at_birth;
            
            RAISE NOTICE 'Participants table conversion completed.';
        ELSE
            RAISE NOTICE 'Participants table already uses snake_case columns.';
        END IF;
    END IF;
    
    -- Convert household_dependents table if it exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'household_dependents'
    ) INTO table_exists;
    
    IF table_exists THEN
        -- Check if camelCase columns exist
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'household_dependents' 
            AND column_name = 'participantId'
        ) INTO camel_case_exists;
        
        IF camel_case_exists THEN
            RAISE NOTICE 'Converting household_dependents table from camelCase to snake_case...';
            
            -- Rename columns in household_dependents table
            ALTER TABLE household_dependents RENAME COLUMN "participantId" TO participant_id;
            ALTER TABLE household_dependents RENAME COLUMN "firstName" TO first_name;
            ALTER TABLE household_dependents RENAME COLUMN "lastName" TO last_name;
            ALTER TABLE household_dependents RENAME COLUMN "dateOfBirth" TO date_of_birth;
            ALTER TABLE household_dependents RENAME COLUMN "isInfant" TO is_infant;
            ALTER TABLE household_dependents RENAME COLUMN "isChild0to5" TO is_child0to5;
            ALTER TABLE household_dependents RENAME COLUMN "createdAt" TO created_at;
            ALTER TABLE household_dependents RENAME COLUMN "updatedAt" TO updated_at;
            ALTER TABLE household_dependents RENAME COLUMN "genderIdentity" TO gender_identity;
            ALTER TABLE household_dependents RENAME COLUMN "sexAtBirth" TO sex_at_birth;
            
            RAISE NOTICE 'Household_dependents table conversion completed.';
        ELSE
            RAISE NOTICE 'Household_dependents table already uses snake_case columns.';
        END IF;
    END IF;
    
    -- Convert mastra_artifacts table if it exists and has camelCase columns
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'mastra_artifacts'
    ) INTO table_exists;
    
    IF table_exists THEN
        -- Check if camelCase columns exist
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'mastra_artifacts' 
            AND column_name = 'sessionId'
        ) INTO camel_case_exists;
        
        IF camel_case_exists THEN
            RAISE NOTICE 'Converting mastra_artifacts table from camelCase to snake_case...';
            
            -- Rename columns in mastra_artifacts table
            ALTER TABLE mastra_artifacts RENAME COLUMN "sessionId" TO session_id;
            ALTER TABLE mastra_artifacts RENAME COLUMN "fileName" TO file_name;
            ALTER TABLE mastra_artifacts RENAME COLUMN "fileType" TO file_type;
            ALTER TABLE mastra_artifacts RENAME COLUMN "mimeType" TO mime_type;
            ALTER TABLE mastra_artifacts RENAME COLUMN "traceId" TO trace_id;
            ALTER TABLE mastra_artifacts RENAME COLUMN "threadId" TO thread_id;
            ALTER TABLE mastra_artifacts RENAME COLUMN "createdAt" TO created_at;
            ALTER TABLE mastra_artifacts RENAME COLUMN "updatedAt" TO updated_at;
            
            RAISE NOTICE 'Mastra_artifacts table conversion completed.';
        ELSE
            RAISE NOTICE 'Mastra_artifacts table already uses snake_case columns.';
        END IF;
    END IF;
    
END $$;

-- Update column types to match our new schema
-- Change TIMESTAMP(3) to TIMESTAMPTZ for better timezone handling
DO $$
DECLARE
    column_exists boolean;
BEGIN
    -- Update participants table timestamps
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'participants' 
        AND column_name = 'date_of_birth'
    ) INTO column_exists;
    
    IF column_exists THEN
        ALTER TABLE participants 
        ALTER COLUMN date_of_birth TYPE TIMESTAMPTZ,
        ALTER COLUMN created_at TYPE TIMESTAMPTZ,
        ALTER COLUMN updated_at TYPE TIMESTAMPTZ;
        
        RAISE NOTICE 'Updated participants timestamp columns to TIMESTAMPTZ.';
    END IF;
    
    -- Update household_dependents table timestamps
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'household_dependents' 
        AND column_name = 'date_of_birth'
    ) INTO column_exists;
    
    IF column_exists THEN
        ALTER TABLE household_dependents 
        ALTER COLUMN date_of_birth TYPE TIMESTAMPTZ,
        ALTER COLUMN created_at TYPE TIMESTAMPTZ,
        ALTER COLUMN updated_at TYPE TIMESTAMPTZ;
        
        RAISE NOTICE 'Updated household_dependents timestamp columns to TIMESTAMPTZ.';
    END IF;
    
    -- Update mastra_artifacts table timestamps
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mastra_artifacts' 
        AND column_name = 'created_at'
    ) INTO column_exists;
    
    IF column_exists THEN
        ALTER TABLE mastra_artifacts 
        ALTER COLUMN created_at TYPE TIMESTAMPTZ,
        ALTER COLUMN updated_at TYPE TIMESTAMPTZ;
        
        RAISE NOTICE 'Updated mastra_artifacts timestamp columns to TIMESTAMPTZ.';
    END IF;
END $$;

-- Add any missing columns that might be in our new schema but not in the old
DO $$
BEGIN
    -- Add missing columns to participants if they don't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'participants' AND column_name = 'has_dependents') THEN
        ALTER TABLE participants ADD COLUMN has_dependents BOOLEAN;
        RAISE NOTICE 'Added has_dependents column to participants.';
    END IF;
    
    -- Add missing columns to household_dependents if they don't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'household_dependents' AND column_name = 'age') THEN
        ALTER TABLE household_dependents ADD COLUMN age INTEGER;
        RAISE NOTICE 'Added age column to household_dependents.';
    END IF;
END $$;

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing triggers if they exist and recreate them
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

COMMIT;

-- Record this migration
INSERT INTO _migrations (filename) VALUES ('000_convert_camelcase_to_snake_case.sql') 
ON CONFLICT (filename) DO NOTHING;
