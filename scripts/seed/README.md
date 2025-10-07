# Database Seed Scripts

This directory contains scripts for seeding the database with test and demo data.

## Available Scripts

### 1. **seed-apricot360-csv.ts** ⭐ PRIMARY

Seeds participant data from Apricot360 CSV export format.

**Purpose:** Import real participant data from Apricot360's CSV export  
**Data Source:** CSV file with comprehensive participant information  
**Use Case:** Production data import, testing with real data structures

**Run:**
```bash
pnpm seed:apricot360
```

**CSV Format:**
- 50+ columns including participant demographics, contact info, addresses
- Supports complex nested data (names, addresses)
- Handles CalWorks ID, ethnicity, languages, special needs
- Includes eligibility criteria and case notes

**Key Features:**
- Comprehensive field mapping from Apricot360 format
- Handles NULL values and empty strings appropriately
- Validates and transforms data types
- Supports both home and mailing addresses
- Processes household member information

---

### 2. **seed-wic.ts**

Seeds specific WIC participant test data.

**Purpose:** Create test participants for WIC application scenarios  
**Data Source:** Hardcoded test data in the script  
**Use Case:** Development, testing WIC-specific workflows

**Run:**
```bash
pnpm seed:wic
```

**Creates:**
- Sarah Johnson (WIC-SJ-2025-001) - Main participant with children
- Maria Garcia (WIC-MG-2025-002) - Pregnant participant
- Lisa Chen (WIC-LC-2025-003) - Post-partum participant
- Complete participant profiles with income, MediCal, pregnancy status

---

### 3. **seed-csv.ts**

Seeds participant data from a generic CSV format.

**Purpose:** Import participant data from custom CSV format  
**Data Source:** CSV file with basic participant information  
**Use Case:** Generic data imports, custom CSV formats

**Run:**
```bash
pnpm seed:csv
```

**CSV Columns:**
- `participantId`, `firstName`, `lastName`, `dateOfBirth`
- `mobileNumber`, `email`, `homeAddress`
- `benefitsReceiving`, `onProbation`, `isVeteran`
- `relationshipStatus`, `householdMemberName`, `householdMemberAge`
- `sexAtBirth`, `genderIdentity`, `ethnicity`, `race`
- `preferredLanguage`

---

### 4. **seed-demo.ts**

Runs a WIC application demo using Mastra's memory system.

**Purpose:** Demonstrate the agent's memory capabilities  
**Data Source:** Simulated conversation flow  
**Use Case:** Demo, testing memory persistence

**Run:**
```bash
pnpm seed
```

**What it does:**
- Creates a demo conversation thread
- Simulates a WIC application conversation
- Demonstrates memory recall across multiple interactions
- Tests agent's ability to remember participant details

---

## Quick Reference

| Script | Purpose | Data Format | Use Case |
|--------|---------|-------------|----------|
| **seed-apricot360-csv.ts** | Import Apricot360 data | CSV (50+ columns) | **Production** |
| seed-wic.ts | Create test participants | Hardcoded | Development |
| seed-csv.ts | Import generic data | CSV (basic) | Custom imports |
| seed-demo.ts | Run memory demo | Simulated | Demo/Testing |

---

## Database Schema

All scripts seed data into the `participants` table with the following structure:

**Core Fields:**
- `participant_id` (VARCHAR PRIMARY KEY)
- `first_name`, `middle_name`, `last_name`
- `date_of_birth` (DATE)
- `home_address`, `mailing_address` (TEXT)
- `mobile_number`, `email`

**Demographics:**
- `preferred_language` (VARCHAR)
- `ethnicity`, `race`, `gender`
- `marital_status`

**Program-Specific:**
- `calworks_id` (VARCHAR)
- `has_medi_cal` (BOOLEAN)
- `medi_cal_case_number`
- `is_pregnant`, `is_post_partum`
- `has_children0to5`, `has_dependents`
- `monthly_income`, `occupation`

**Extended Fields (Apricot360):**
- `primary_language_spoken_at_home`
- `preferred_method_of_contact`
- `pregnancy_child_status`
- `financial_assistance_sources`
- `household_members` (JSONB)
- `special_needs`, `special_needs_notes`
- And 30+ more fields...

See `migrations/` for complete schema definitions.

---

## Prerequisites

Before running any seed script:

1. **Database Setup:**
   ```bash
   pnpm db:migrate
   ```

2. **Environment Variables:**
   Create `.env` with:
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/dbname
   ```

3. **Data Files (for CSV/JSON imports):**
   Place data files in the project root or update paths in scripts

---

## Development Workflow

**Typical workflow for testing:**

1. **Reset database:**
   ```bash
   pnpm db:migrate
   ```

2. **Seed test data:**
   ```bash
   pnpm seed:wic         # Quick test data
   # OR
   pnpm seed:apricot360  # Real Apricot360 data
   ```

3. **Run your tests/agents:**
   ```bash
   pnpm dev
   ```

---

## Adding New Seed Scripts

When creating a new seed script:

1. **Create file:** `scripts/seed/seed-[name].ts`

2. **Import dependencies:**
   ```typescript
   import { query, pgPool } from '../../src/lib/db.js';
   import { config } from 'dotenv';
   config();
   ```

3. **Add npm script to package.json:**
   ```json
   "seed:[name]": "tsx scripts/seed/seed-[name].ts"
   ```

4. **Document in this README**

---

## Troubleshooting

### "Database connection failed"
- Check `.env` has correct `DATABASE_URL`
- Ensure PostgreSQL is running
- Verify database exists

### "Table doesn't exist"
- Run migrations first: `pnpm db:migrate`

### "CSV parsing error"
- Check CSV file encoding (should be UTF-8)
- Verify column headers match expected format
- Check for special characters or malformed rows

### "Duplicate key error"
- Participant IDs must be unique
- Clear existing data first or use different IDs

---

## Best Practices

1. **Always run migrations first** before seeding
2. **Use seed-wic.ts for quick testing** (fast, predictable)
3. **Use seed-apricot360-csv.ts for production-like testing** (real data structures)
4. **Commit seed scripts** but not actual data files
5. **Document data sources** and any transformations
6. **Handle NULL values appropriately** (use `null` not empty strings)

---

## Related Documentation

- Database Schema: `migrations/README.md`
- Database Tools: `src/mastra/tools/database-tools.ts`
- Participant Types: `src/mastra/types/participant-types.ts`

