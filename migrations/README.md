# Database Migrations

This directory contains SQL migration scripts that replace the Prisma migrations for the WIC Benefits application.

## Files

- `000_convert_camelcase_to_snake_case.sql` - Converts existing Prisma camelCase columns to snake_case (if needed)
- `001_create_tables.sql` - Creates all tables, indexes, and triggers
- `002_add_datasourcetype_field.sql` - Adds datasourcetype field to track data source (START vs APRICOT360)
- `003_add_apricot360_fields.sql` - Adds APRICOT360-specific fields (calworks_id, preferred_contact_method, etc.)
- `004_fix_mastra_artifacts_uuid.sql` - Fixes UUID generation for mastra_artifacts table
- `005_add_apricot360_csv_fields.sql` - Adds comprehensive APRICOT360 CSV fields (consent tracking, additional phones, addresses, etc.)
- `run-migrations.js` - Simple migration runner script
- `README.md` - This file

## Usage

### Running Migrations

```bash
# Run all pending migrations
node migrations/run-migrations.js

# Or from the root directory
node ./migrations/run-migrations.js
```

### Manual Migration Execution

You can also run migrations manually using `psql`:

```bash
psql $DATABASE_URL -f migrations/001_create_tables.sql
```

## Migration Tracking

The migration runner creates a `_migrations` table to track which migrations have been executed. This prevents duplicate execution of the same migration.

## Database Schema

The current schema includes:

### Tables

1. **participants** - Main participant records
2. **household_dependents** - Household members/dependents
3. **mastra_artifacts** - Playwright artifacts and session data
4. **_migrations** - Migration tracking (created automatically)

### Features

- Automatic `updated_at` timestamp updates via triggers
- UUID generation for primary keys
- Proper foreign key relationships
- Comprehensive indexing for performance
- Snake_case column naming (converted from Prisma's camelCase)

## Converting from Prisma

This migration system replaces:

- `npx prisma migrate dev`
- `npx prisma migrate deploy` 
- `npx prisma db push`

The schema is equivalent to the final Prisma schema but uses:

- Snake_case column names instead of camelCase
- Direct PostgreSQL types instead of Prisma abstractions
- Explicit UUID generation instead of Prisma's `cuid()`
- PostgreSQL triggers for `updated_at` instead of Prisma's `@updatedAt`

## Adding New Migrations

1. Create a new `.sql` file with a sequential number prefix (e.g., `002_add_new_field.sql`)
2. Write standard PostgreSQL DDL statements
3. Run the migration runner to apply changes

Example new migration file:

```sql
-- 002_add_new_field.sql
ALTER TABLE participants ADD COLUMN new_field TEXT;
CREATE INDEX participants_new_field_idx ON participants(new_field);
```
