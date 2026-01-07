# Migration to APRICOT360 Schema

This document outlines the process for migrating from the START schema to the APRICOT360 schema.

## Overview

The migration involves:
1. Running database migration 006 to update the schema
2. Clearing all existing participant data (one-time manual operation)
3. Re-seeding the database with APRICOT360 CSV data

## Prerequisites

- PostgreSQL database access
- DATABASE_URL environment variable set in `.env`
- APRICOT360 CSV file at `~/Downloads/a360-participant-profile.csv` (or custom path)
- Node.js and npm installed

## Migration Steps

### Step 1: Run Migration 006

Migration 006 will:
- Drop START-specific columns (can_receive_texts, has_medi_cal, is_pregnant, is_post_partum, etc.)
- Rename columns (preferred_language → primary_language, sex_at_birth → gender)
- Add new APRICOT360 columns (other_financial_assistance, ssi_ssp, primary_family_name_*, family_participant_type)
- Remove old address columns in favor of structured address fields

```bash
npm run migrate
```

This will execute `migrations/run-migrations.js` which runs all pending migrations including 006.

### Step 2: Clear Existing Data (ONE-TIME MANUAL OPERATION)

IMPORTANT: This is a destructive operation that will delete all participant data. Only do this once during the migration.

Connect to your database and run:

```sql
DELETE FROM household_dependents;
DELETE FROM participants;
```

Or use psql:

```bash
psql $DATABASE_URL -c "DELETE FROM household_dependents;"
psql $DATABASE_URL -c "DELETE FROM participants;"
```

### Step 3: Seed APRICOT360 Data

```bash
npm run seed:apricot360
```

Or with a custom CSV path:

```bash
npm run seed:apricot360 -- /path/to/your/apricot360-file.csv
```

## What Changed

### Columns Dropped

From `participants` table:
- can_receive_texts
- has_medi_cal
- is_pregnant
- is_post_partum
- is_infant_breastfeeding
- is_infant_formula
- has_children0to5
- monthly_income
- home_address (replaced by structured address_* fields)
- mailing_address (replaced by structured mailing_address_* fields)
- benefits_receiving
- on_probation
- is_veteran
- medi_cal_case_number
- medi_cal_amount
- occupation
- race (keeping ethnicity)

From `household_dependents` table:
- race (keeping ethnicity)

### Columns Renamed

- `preferred_language` → `primary_language`
- `sex_at_birth` → `gender`

### Columns Added

- other_financial_assistance (TEXT, nullable - no data in current CSV)
- ssi_ssp (TEXT, nullable - no data in current CSV)
- primary_family_name_first (TEXT, from CSV)
- primary_family_name_last (TEXT, from CSV)
- primary_family_name_middle (TEXT, from CSV)
- family_participant_type (TEXT, nullable - no data in current CSV)

## Code Changes

### seed-apricot360-csv.ts

Updated to:
- Use `primary_language` instead of `preferred_language`
- Use `gender` instead of `sex_at_birth`
- Remove references to dropped columns
- Add new APRICOT360 column mappings

### database-tools.ts

Updated to:
- Transform fields using new column names
- Disable create/update tools (data is read-only from CSV)
- Update search queries to use structured address fields instead of home_address

## Troubleshooting

### Migration 006 fails with "column does not exist"

This might happen if you're running migration 006 on a database that already had some columns dropped. The migration uses `DROP COLUMN IF EXISTS` so it should be safe to re-run.

### Seed script fails with "column does not exist"

Make sure migration 006 completed successfully before running the seed script.

### Missing CSV columns

The current CSV file does not include data for:
- Other Financial Assistance
- SSI/SSP
- Family Participant Type

These columns will be created in the database but will be NULL for all records. They can be populated later if the CSV is updated.

## Rollback

There is no automatic rollback for this migration. If you need to rollback:

1. Restore database from backup (recommended)
2. Or manually recreate the dropped columns and rename the renamed columns back

It's recommended to backup your database before starting the migration.
