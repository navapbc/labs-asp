# Benefits Database Setup Guide

This guide covers setting up and managing the PostgreSQL database for the WIC Benefits application.

## Database Overview

The database is designed to store participant information for the WIC (Women, Infants, and Children) benefits program with the following main entities:

- **Participants**: Main applicants with personal info, income, and WIC-specific data
- **HouseholdDependents**: Children and family members associated with participants
- **Mastra Artifacts**: Playwright screenshots and automation artifacts

## Setup Options

### Option 1: Docker (Recommended)

See **[DOCKER_SETUP.md](DOCKER_SETUP.md)** for complete instructions.

Quick start:
```bash
# Start PostgreSQL in Docker
docker-compose up -d postgres

# Database will be available at localhost:5434
# Connection: postgresql://postgres:postgres@localhost:5434/benefits_db

# Run migrations
node migrations/run-migrations.js
```

Benefits:
- ✅ No local PostgreSQL installation needed
- ✅ Includes pgvector extension for AI embeddings (required by Mastra)
- ✅ Consistent across team
- ✅ Easy to reset/clean up
- ✅ Isolated from host system

**Note:** The Docker setup uses `pgvector/pgvector:pg16` which includes the pgvector extension pre-installed. This extension is required for Mastra's agent memory and semantic search capabilities.

### Option 2: Local PostgreSQL Installation

#### 1. Install PostgreSQL

```bash
# Install PostgreSQL using Homebrew (macOS)
brew install postgresql@16

# Start PostgreSQL service
brew services start postgresql@16
```

#### 2. Create Database

```bash
# Create the benefits database
createdb benefits_db
```

### 3. Install Dependencies

```bash
# Install Prisma and PostgreSQL client
pnpm add prisma @prisma/client pg
pnpm add -D @types/pg
```

### 4. Environment Configuration

Ensure your `.env` file contains:

```env
DATABASE_URL="postgresql://your_username@localhost/benefits_db?schema=public"
```

> **Note**: Replace `your_username` with your system username (run `whoami` to find it)

### 5. Generate Prisma Client

```bash
npx prisma generate
```

## Available Commands

### Database Migration Commands

```bash
# Create and apply new migration from schema changes
pnpm db:migrate

# Reset database (drops all data and recreates from scratch)
pnpm db:reset

# Deploy migrations to production
npx prisma migrate deploy
```

### Seeding Commands

```bash
# Seed WIC benefits test data (Sarah Johnson + additional participants)
pnpm seed:wic

# Seed original Mastra test data
pnpm seed
```

### Prisma Utility Commands

```bash
# Generate Prisma client after schema changes
npx prisma generate

# Open Prisma Studio (database browser UI)
pnpm db:studio

# View current database status
npx prisma migrate status

# Format Prisma schema file
npx prisma format
```

## Viewing Your Data

### Option 1: Prisma Studio (Recommended)

Prisma Studio provides a user-friendly web interface to browse and edit your database:

```bash
pnpm db:studio
```

This will open `http://localhost:5555` in your browser where you can:
- View all tables and records
- Filter and search data
- Edit records directly
- See relationships between tables

### Option 2: Command Line (psql)

```bash
# Connect to the database
psql -d benefits_db

# View all participants
SELECT "participantId", "firstName", "lastName", "homeAddress" FROM participants;

# View household relationships
SELECT 
  p."firstName" as parent_name, 
  h."firstName" as dependent_name, 
  h.relationship, 
  h."dateOfBirth" 
FROM participants p 
JOIN household_dependents h ON p.id = h."participantId";

# Exit psql
\q
```

## Sample Data

After running `pnpm seed:wic`, you'll have:

### Participant 1: Sarah Johnson
- **ID**: WIC-SJ-2025-001
- **Address**: 456 Oak Street, Riverside, CA 92503
- **Income**: $2,500/month
- **Occupation**: Part-time grocery store worker
- **Phone**: (951) 555-0789
- **Email**: sarah.johnson@email.com
- **Child**: Emma Johnson (born March 15, 2022)

### Participant 2: Maria Rodriguez
- **ID**: WIC-MB-2025-002
- **Address**: 789 Pine Avenue, Riverside, CA 92505
- **Income**: $1,800/month
- **Occupation**: Restaurant server
- **Has MediCal**: Yes (Case #MC-12345678)
- **Child**: Carlos Rodriguez (born June 10, 2021)

## Troubleshooting

### Common Issues

#### Authentication Error (P1010)
```
Error: P1010: User was denied access on the database
```

**Solution**: Update your `DATABASE_URL` to include your username:
```env
DATABASE_URL="postgresql://your_username@localhost/benefits_db?schema=public"
```

#### Database Doesn't Exist
```
Error: database "benefits_db" does not exist
```

**Solution**: Create the database:
```bash
createdb benefits_db
```

#### PostgreSQL Not Running
```
Error: could not connect to server
```

**Solution**: Start PostgreSQL:
```bash
brew services start postgresql@16
```

### Useful Debugging Commands

```bash
# Check if PostgreSQL is running
brew services list | grep postgresql

# List all databases
psql -l

# Check database connection
psql -d benefits_db -c "SELECT version();"

# View schema information
npx prisma db pull
```

## Schema Structure

### Participants Table
```prisma
model Participant {
  id                String   @id @default(cuid())
  participantId     String   @unique
  firstName         String
  lastName          String
  dateOfBirth       DateTime
  homeAddress       String
  mailingAddress    String?
  mobileNumber      String
  canReceiveTexts   Boolean  @default(false)
  preferredLanguage String   @default("English")
  email             String?
  
  // MediCal information
  hasMediCal        Boolean  @default(false)
  mediCalCaseNumber String?
  mediCalAmount     Decimal?
  
  // WIC specific fields
  isPregnant        Boolean  @default(false)
  isPostPartum      Boolean  @default(false)
  isInfantBreastfeeding Boolean @default(false)
  isInfantFormula   Boolean  @default(false)
  hasChildren0to5   Boolean  @default(false)
  
  // Income information
  monthlyIncome     Decimal?
  occupation        String?
  
  // Relationships
  household         HouseholdDependent[]
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

### HouseholdDependents Table
```prisma
model HouseholdDependent {
  id             String      @id @default(cuid())
  participantId  String
  participant    Participant @relation(fields: [participantId], references: [id], onDelete: Cascade)
  
  firstName      String
  lastName       String
  dateOfBirth    DateTime
  relationship   String      // "child", "spouse", "dependent", etc.
  
  // WIC specific for children
  isInfant       Boolean     @default(false)
  isChild0to5    Boolean     @default(false)
  
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt
}
```

## Development Workflow

1. **Make schema changes** in `prisma/schema.prisma`
2. **Generate migration**: `pnpm db:migrate`
3. **Update Prisma client**: `npx prisma generate` (usually automatic)
4. **Test with fresh data**: `pnpm seed:wic`
5. **View results**: `pnpm db:studio`
6. **Reset database**: `pnpm db:reset`

---

**Tip**: Keep Prisma Studio open while developing to see real-time data changes as your application runs.