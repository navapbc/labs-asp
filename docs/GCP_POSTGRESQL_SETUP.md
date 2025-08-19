## Overview

We migrated to Google Cloud SQL PostgreSQL due to memory and storage limitations on our previous database. The setup uses a cost-effective shared-core instance suitable for development environments.

## Prerequisites

- Google Cloud SDK (`gcloud`) installed and authenticated
- Access to the `nava-labs` GCP project
- Appropriate IAM permissions for Cloud SQL

## Database Configuration

### Instance Details
- **Instance Name:** `app-dev`
- **Database Engine:** PostgreSQL 15
- **Tier:** `db-g1-small` (1.7 GB RAM, shared-core)
- **Region:** `us-central1`
- **Storage:** 100GB SSD with automatic backups enabled
- **IP Address:** `your_ip_address`

### Database & User
- **Database Name:** `app_db`
- **Username:** `app_user`
- **Password:** `your_password`

## Setup Instructions

### 1. Verify GCP Project Configuration

```bash
# Check current project
gcloud config get-value project
# Should return: nava-labs
```

### 2. Create PostgreSQL Instance

```bash
gcloud sql instances create app-dev \
  --database-version=POSTGRES_15 \
  --tier=db-g1-small \
  --region=us-central1 \
  --storage-type=SSD \
  --storage-size=100GB \
  --backup
```

**Note:** PostgreSQL on Cloud SQL only supports custom tiers or shared-core tiers (not the standard predefined tiers like `db-n1-standard-*`).

### 3. Create Database

```bash
gcloud sql databases create app_db --instance=app-dev
```

### 4. Create Database User

```bash
gcloud sql users create app_user \
  --instance=app-dev \
  --password=your_password
```

### 5. Get Connection Information

```bash
# Get the instance IP address
gcloud sql instances describe app-dev \
  --format="value(ipAddresses[0].ipAddress)"
```

### 6. Authorize Your IP Address

Before you can connect to the database, you need to add your current IP address to the authorized networks:

```bash
# Get your current public IP address
curl -s https://ipinfo.io/ip

# Add your IP to the authorized networks (replace YOUR_IP with the actual IP)
gcloud sql instances patch app-dev --authorized-networks=YOUR_IP
```

**Important:** When adding a new IP address, make sure to include any previously authorized IPs, otherwise they will be overwritten.

### 7. Update Environment Configuration

Update your `.env` file with the new database connection string:

```env
# New GCP Cloud SQL PostgreSQL
DATABASE_URL="postgresql://app_user:your_password@your_ip_address/app_db?sslmode=require"
```

## Connection String Format

```
postgresql://[username]:[password]@[host]:[port]/[database]?[parameters]
```

For our setup:
- **Username:** `app_user`
- **Password:** `your_password`
- **Host:** `your_ip_address`
- **Port:** `5432` (default, omitted)
- **Database:** `app_db`
- **SSL Mode:** `require` (mandatory for Cloud SQL)

## Database Migration

After setting up the new database and authorizing your IP, run Prisma migrations to set up the schema:

```bash
# Deploy existing migrations to the new database
npx prisma migrate deploy

# Generate the Prisma client
npx prisma generate

# Verify the schema is synchronized (optional)
npx prisma db push --accept-data-loss
```

**Note:** If you get a connection error, make sure you've completed step 6 (IP authorization) above.

## Environment Naming Convention

Following our multi-environment strategy:
- **Development:** `app-dev` (current setup)
- **Staging:** `app-staging` (future)
- **Production:** `app-prod` (future)

## Cost Considerations

- **Tier:** `db-g1-small` is cost-effective for development
- **Storage:** 100GB SSD provides good performance
- **Backups:** Enabled for data safety
- **Region:** `us-central1` offers good pricing

## Troubleshooting

### Common Issues

1. **"Only custom or shared-core instance Billing Tier type allowed for PostgreSQL"**
   - Use `db-g1-small` or `db-custom-X-Y` tiers, not `db-n1-standard-*`

2. **"Can't reach database server" or connection timeouts**
   - Ensure your IP is authorized: `gcloud sql instances patch app-dev --authorized-networks=YOUR_IP`
   - Verify SSL mode is set to `require`
   - Check that the instance is running: `gcloud sql instances describe app-dev`

3. **Prisma migration fails**
   - Make sure IP authorization is complete before running migrations
   - Verify the DATABASE_URL in your `.env` file is correct

### Useful Commands

```bash
# List all SQL instances
gcloud sql instances list

# Get instance details
gcloud sql instances describe app-dev

# List databases in instance
gcloud sql databases list --instance=app-dev

# List users in instance
gcloud sql users list --instance=app-dev

# Connect via gcloud (for testing)
gcloud sql connect app-dev --user=app_user --database=app_db
```

## Security Notes

- Database password is stored in `.env` file (ensure it's in `.gitignore`)
- SSL is required for all connections
- Plan to use Cloud SQL Proxy for better security in production
- IP whitelisting should be configured for production environments
