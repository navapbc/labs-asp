# Mastra Test App Migration & Production Setup Specification

## Overview

This document outlines the complete migration process for moving the `mastra-test-app` directory from the current repository to a new standalone repository, along with setting up a production-grade infrastructure on Google Cloud Platform (GCP) with proper CI/CD pipelines.

## Table of Contents

1. [Repository Migration](#repository-migration)
2. [New Repository Setup](#new-repository-setup)
3. [CI/CD Pipeline Configuration](#cicd-pipeline-configuration)
4. [Terraform Infrastructure Setup](#terraform-infrastructure-setup)
5. [Production Deployment Flow](#production-deployment-flow)
6. [Database Versioning & Management](#database-versioning--management)
7. [Environment Management](#environment-management)

---

## Architecture Overview & Design Decisions

### Current vs. Proposed Architecture

#### Current Setup (Manual VM Approach)
- **Compute**: Single GCE VM (`e2-standard-2`) with manual setup
- **Database**: Cloud SQL PostgreSQL (`app-dev`, `db-g1-small`) with IP whitelisting
- **Deployment**: Manual SSH, git clone, PM2 process management
- **Networking**: Public IP with firewall rules, direct database connection
- **Scaling**: None (single instance)

#### Proposed Architecture (Hybrid: Cloud Run + GCE for Browsers)
- **Main App**: Cloud Run (serverless) for web UI, APIs, and lightweight agents
- **Browser Services**: GCE VMs with persistent browser processes and MCP Gateway
- **Database**: Cloud SQL PostgreSQL with private networking via VPC
- **Deployment**: CI/CD with Vercel-style preview environments
- **Networking**: Private VPC connecting all components
- **Scaling**: Cloud Run auto-scales, GCE instances for stable browser pools

### Key Design Decisions

#### 1. Hybrid Architecture: Cloud Run + GCE Browser Pool
**Decision**: Use Cloud Run for main app + GCE VMs for browser services
**Rationale**:
- **Serverless for Stateless**: Cloud Run perfect for web UI, APIs, simple agents
- **Persistent for Stateful**: GCE VMs needed for long-running Playwright/Chromium processes
- **Cost Optimization**: Pay-per-use for main app, fixed cost for browser infrastructure
- **Separation of Concerns**: Web traffic scales independently from browser capacity
- **Docker MCP Gateway Pattern**: Following proven architecture from Docker's implementation

#### 2. Database Architecture
**Decision**: Keep Cloud SQL PostgreSQL but migrate to private networking
**Rationale**:
- **Existing Investment**: You already have Cloud SQL PostgreSQL set up (`app-dev`)
- **Security Enhancement**: Move from IP whitelisting to private VPC networking
- **Performance**: Reduced latency with private network connections
- **Scalability**: Easier to add read replicas and connection pooling later
- **Multi-Environment**: Separate databases per environment with consistent architecture

**Migration Path**:
```
Current: Cloud Run → Public IP → Cloud SQL (IP whitelisted)
Proposed: Cloud Run → VPC Connector → Private Network → Cloud SQL
```

#### 3. Redis Inclusion (Optional)
**Decision**: Include Redis in docker-compose for local development only
**Rationale**:
- **Local Development**: Provides caching layer for development/testing
- **Session Storage**: Can store JWT sessions, rate limiting data
- **Production**: Can be added later via Google Memorystore if needed
- **Not Required**: Application should work without Redis (graceful degradation)

#### 4. Preview Environment Strategy
**Decision**: Implement Vercel-style preview deployments
**Rationale**:
- **Developer Experience**: Each PR gets its own environment for testing
- **Database Isolation**: Each preview uses separate database schema
- **Automatic Cleanup**: Preview environments auto-delete when PR closes
- **Cost Control**: Preview environments use minimal resources

### Infrastructure Components

#### Terraform Modules Created
1. **Database Module** (`terraform/modules/database/`)
   - Cloud SQL PostgreSQL instance
   - VPC network with private IP ranges
   - VPC Connector for Cloud Run access
   - Database user and password management

2. **Cloud Run Module** (`terraform/modules/cloud-run/`)
   - Service account with minimal required permissions
   - Cloud Run service configuration
   - Environment-specific resource limits
   - Health checks and auto-scaling settings

3. **Environment Configurations** (`terraform/environments/`)
   - Development: Cost-optimized, single instance
   - Staging: Multi-instance with load balancing
   - Production: High availability with regional setup

#### CI/CD Pipeline Design
1. **Branch-Based Deployments**:
   - `main` → Production deployment
   - `develop` → Staging deployment
   - Feature branches → Preview deployments
   - Pull requests → Preview deployments with PR comments

2. **Container Build Process**:
   - Multi-stage Docker build for optimization
   - Artifact Registry for container storage
   - Automatic tagging with deployment ID and commit SHA

3. **Database Migration Strategy**:
   - Production: `prisma migrate deploy` (safe, no data loss)
   - Preview: Separate schemas per deployment
   - Rollback: Container rollback + database backup restoration

### Security Architecture

#### Secrets Management
- **Google Secret Manager**: All sensitive data (API keys, DB passwords)
- **Environment Isolation**: Separate secrets per environment
- **Least Privilege**: Service accounts with minimal required permissions
- **No Hardcoded Secrets**: All secrets injected at runtime

#### Network Security
- **Private Networking**: Database not accessible from public internet
- **VPC Peering**: Secure communication between Cloud Run and Cloud SQL
- **SSL/TLS**: All connections encrypted in transit
- **IAM Roles**: Fine-grained access control

### Cost Analysis

#### Current Setup (Monthly)
- GCE VM (`e2-standard-2`): ~$50/month (running 24/7)
- Cloud SQL (`db-g1-small`): ~$25/month
- **Total**: ~$75/month

#### Proposed Setup (Monthly)
- Cloud Run (with auto-scaling): ~$10-30/month (pay per use)
- Cloud SQL (upgraded to private networking): ~$25/month
- VPC Connector: ~$5/month
- Artifact Registry: ~$2/month
- **Total**: ~$42-62/month (42% cost reduction)

### Migration Benefits

1. **Developer Experience**
   - Vercel-style preview environments
   - Automatic deployments on git push
   - Zero-downtime production deployments
   - Easy rollbacks

2. **Operational Benefits**
   - No server management
   - Automatic scaling
   - Built-in monitoring and logging
   - Infrastructure as Code

3. **Security Improvements**
   - Private networking
   - Secrets management
   - Least privilege access
   - Encrypted connections

4. **Cost Optimization**
   - Pay-per-use pricing
   - No idle server costs
   - Automatic resource optimization

---

## 1. Repository Migration

### Step 1: Extract Directory with Git History

Using `git subtree` to preserve complete git history:

```bash
# From the current repository root (/Users/foadgreen/projects/labs-asp-experiments)
git subtree push --prefix=mastra-test-app origin mastra-test-app-extraction

# Alternative: Create a new branch with only the mastra-test-app history
git subtree split --prefix=mastra-test-app -b mastra-test-app-standalone
```

### Step 2: Create New Repository

```bash
# Create new repository directory
mkdir labs-asp
cd labs-asp

# Initialize git and pull the extracted history
git init
git remote add origin <new-repository-url>
git pull ../labs-asp-experiments mastra-test-app-standalone
git branch -m main
git push -u origin main
```

### Step 3: Verify History Preservation

```bash
# Verify git history is intact
git log --oneline --follow
git log --stat
```

---

## 2. New Repository Setup

### Repository Structure

```
labs-asp/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── cd-staging.yml
│       ├── cd-production.yml
│       └── security.yml
├── terraform/
│   ├── environments/
│   │   ├── development/
│   │   ├── staging/
│   │   └── production/
│   ├── modules/
│   │   ├── compute/
│   │   ├── database/
│   │   ├── storage/
│   │   └── networking/
│   └── shared/
├── src/ (existing mastra-test-app content)
├── docs/
├── scripts/
├── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
└── README.md
```

### Essential Files to Create

1. **Dockerfile** - Multi-stage build for production
2. **docker-compose.yml** - Local development environment
3. **.dockerignore** - Optimize build context
4. **renovate.json** - Automated dependency updates
5. **.nvmrc** - Node.js version specification
6. **SECURITY.md** - Security policy
7. **CONTRIBUTING.md** - Contribution guidelines

---

## 3. CI/CD Pipeline Configuration

### GitHub Actions Workflows

#### 3.1 Continuous Integration (`.github/workflows/ci.yml`)

```yaml
name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v4
      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Type check
        run: pnpm type-check
      
      - name: Lint
        run: pnpm lint
      
      - name: Test
        run: pnpm test:coverage
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
      
      - name: Build
        run: pnpm build
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
```

#### 3.2 Security Scanning (`.github/workflows/security.yml`)

```yaml
name: Security

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
  schedule:
    - cron: '0 6 * * 1'

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run Snyk to check for vulnerabilities
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
      
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
```

#### 3.3 Deployment Workflows

**Staging Deployment** (`.github/workflows/cd-staging.yml`):
- Triggered on merge to `develop` branch
- Deploy to staging GCE instance
- Run integration tests
- Database migration with rollback capability

**Production Deployment** (`.github/workflows/cd-production.yml`):
- Triggered on merge to `main` branch
- Blue-green deployment strategy
- Automated rollback on failure
- Health checks and smoke tests

---

## 4. Terraform Infrastructure Setup

### 4.1 Directory Structure

```
terraform/
├── environments/
│   ├── development/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── terraform.tfvars
│   ├── staging/
│   └── production/
├── modules/
│   ├── compute/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── database/
│   ├── storage/
│   └── networking/
└── shared/
    ├── backend.tf
    └── provider.tf
```

### 4.2 Core Infrastructure Modules

#### Compute Module (`terraform/modules/compute/main.tf`)

```hcl
resource "google_compute_instance_template" "app_template" {
  name_prefix  = "${var.environment}-labs-asp-"
  machine_type = var.machine_type
  
  disk {
    source_image = "cos-cloud/cos-stable"
    auto_delete  = true
    boot         = true
    disk_size_gb = var.disk_size
  }
  
  network_interface {
    network    = var.network
    subnetwork = var.subnetwork
    access_config {
      // Ephemeral public IP
    }
  }
  
  metadata = {
    startup-script = templatefile("${path.module}/startup-script.sh", {
      docker_image = var.docker_image
      environment  = var.environment
    })
  }
  
  service_account {
    email  = var.service_account_email
    scopes = ["cloud-platform"]
  }
  
  lifecycle {
    create_before_destroy = true
  }
}

resource "google_compute_instance_group_manager" "app_igm" {
  name               = "${var.environment}-labs-asp-igm"
  base_instance_name = "${var.environment}-labs-asp"
  zone               = var.zone
  target_size        = var.instance_count
  
  version {
    instance_template = google_compute_instance_template.app_template.id
  }
  
  auto_healing_policies {
    health_check      = google_compute_health_check.app_health_check.id
    initial_delay_sec = 300
  }
}
```

#### Database Module (`terraform/modules/database/main.tf`)

```hcl
resource "google_sql_database_instance" "main" {
  name             = "${var.environment}-labs-asp-db"
  database_version = "POSTGRES_15"
  region           = var.region
  
  settings {
    tier                        = var.db_tier
    availability_type           = var.environment == "production" ? "REGIONAL" : "ZONAL"
    disk_size                  = var.disk_size
    disk_autoresize           = true
    disk_autoresize_limit     = var.max_disk_size
    
    backup_configuration {
      enabled                        = true
      start_time                     = "02:00"
      point_in_time_recovery_enabled = true
      backup_retention_settings {
        retained_backups = var.backup_retention_days
      }
    }
    
    ip_configuration {
      ipv4_enabled    = false
      private_network = var.network
    }
    
    database_flags {
      name  = "log_statement"
      value = "all"
    }
  }
  
  deletion_protection = var.environment == "production" ? true : false
}

resource "google_sql_database" "app_db" {
  name     = "labs_asp_app"
  instance = google_sql_database_instance.main.name
}
```

#### Storage Module (`terraform/modules/storage/main.tf`)

```hcl
resource "google_storage_bucket" "app_storage" {
  name          = "${var.project_id}-${var.environment}-labs-asp-storage"
  location      = var.region
  force_destroy = var.environment != "production"
  
  versioning {
    enabled = true
  }
  
  lifecycle_rule {
    condition {
      age = var.object_lifecycle_days
    }
    action {
      type = "Delete"
    }
  }
  
  lifecycle_rule {
    condition {
      age                   = 30
      with_state           = "NONCURRENT_VERSION"
    }
    action {
      type = "Delete"
    }
  }
}

resource "google_storage_bucket_iam_member" "app_storage_access" {
  bucket = google_storage_bucket.app_storage.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${var.service_account_email}"
}
```

### 4.3 Environment-Specific Configurations

#### Production Environment (`terraform/environments/production/terraform.tfvars`)

```hcl
# Project Configuration
project_id = "labs-asp-production"
region     = "us-central1"
zone       = "us-central1-a"

# Compute Configuration
machine_type    = "e2-standard-4"
instance_count  = 3
disk_size      = 50

# Database Configuration
db_tier               = "db-custom-4-16384"
backup_retention_days = 30
max_disk_size        = 1000

# Storage Configuration
object_lifecycle_days = 365

# Network Configuration
enable_nat_gateway = true
```

---

## 5. Production Deployment Flow

### 5.1 Environment Progression

```mermaid
graph LR
    A[Development] --> B[Staging]
    B --> C[Production]
    
    A1[Local Docker] --> A
    B1[GCE Staging] --> B
    C1[GCE Production] --> C
    
    D[Feature Branch] --> A
    E[Develop Branch] --> B
    F[Main Branch] --> C
```

### 5.2 GCE VM Setup Strategy

#### Development Environment
- **VM Type**: `e2-micro` (cost-effective)
- **Instances**: 1
- **Database**: Cloud SQL (db-f1-micro)
- **Storage**: Single region bucket
- **Deployment**: Manual via GitHub Actions

#### Staging Environment
- **VM Type**: `e2-standard-2`
- **Instances**: 2 (load balanced)
- **Database**: Cloud SQL (db-custom-2-8192)
- **Storage**: Multi-region bucket
- **Deployment**: Automated on develop branch merge

#### Production Environment
- **VM Type**: `e2-standard-4` or higher
- **Instances**: 3+ (auto-scaling enabled)
- **Database**: Cloud SQL (Regional, High Availability)
- **Storage**: Multi-region with versioning
- **Deployment**: Blue-green deployment with approval gates

### 5.3 Deployment Scripts

#### Startup Script Template (`terraform/modules/compute/startup-script.sh`)

```bash
#!/bin/bash

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Configure Docker to start on boot
systemctl enable docker
systemctl start docker

# Pull and run the application
docker pull ${docker_image}
docker run -d \
  --name labs-asp-app \
  --restart unless-stopped \
  -p 80:3000 \
  -e ENVIRONMENT=${environment} \
  -e DATABASE_URL=$(gcloud secrets versions access latest --secret="database-url-${environment}") \
  -e GCS_BUCKET=$(gcloud secrets versions access latest --secret="gcs-bucket-${environment}") \
  ${docker_image}

# Setup monitoring
curl -sSO https://dl.google.com/cloudagents/add-google-cloud-ops-agent-repo.sh
bash add-google-cloud-ops-agent-repo.sh --also-install
```

---

## 6. Database Versioning & Management

### 6.1 Database Migration Strategy

```typescript
// prisma/migrations/migration-runner.ts
export class MigrationRunner {
  async runMigrations(environment: string) {
    // Pre-migration backup
    await this.createBackup(environment);
    
    try {
      // Run Prisma migrations
      await prisma.$executeRaw`SELECT 1`; // Health check
      await this.executeMigrations();
      
      // Post-migration validation
      await this.validateMigration();
      
    } catch (error) {
      // Rollback on failure
      await this.rollbackMigration();
      throw error;
    }
  }
}
```

### 6.2 Database Backup & Recovery

```yaml
# .github/workflows/db-backup.yml
name: Database Backup

on:
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM
  workflow_dispatch:

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - name: Create Database Backup
        run: |
          gcloud sql export sql labs-asp-db-production \
            gs://labs-asp-backups/db-backup-$(date +%Y%m%d-%H%M%S).sql \
            --database=labs_asp_app
```

### 6.3 Cloud SQL Configuration

```hcl
# terraform/modules/database/versions.tf
resource "google_sql_database_instance" "replica" {
  count                = var.environment == "production" ? 1 : 0
  name                 = "${var.environment}-labs-asp-db-replica"
  database_version     = "POSTGRES_15"
  region              = var.replica_region
  master_instance_name = google_sql_database_instance.main.name
  
  replica_configuration {
    failover_target = false
  }
}
```

---

## 7. Environment Management

### 7.1 Secret Management

Use Google Secret Manager for sensitive configuration:

```bash
# Create secrets for each environment
gcloud secrets create database-url-development --data-file=dev-db-url.txt
gcloud secrets create database-url-staging --data-file=staging-db-url.txt
gcloud secrets create database-url-production --data-file=prod-db-url.txt
```

### 7.2 Configuration Management

```typescript
// src/config/environment.ts
export const config = {
  development: {
    database: {
      url: process.env.DATABASE_URL,
      ssl: false,
      pool: { min: 1, max: 5 }
    },
    storage: {
      bucket: process.env.GCS_BUCKET_DEV
    }
  },
  staging: {
    database: {
      url: process.env.DATABASE_URL,
      ssl: true,
      pool: { min: 2, max: 10 }
    },
    storage: {
      bucket: process.env.GCS_BUCKET_STAGING
    }
  },
  production: {
    database: {
      url: process.env.DATABASE_URL,
      ssl: true,
      pool: { min: 5, max: 20 }
    },
    storage: {
      bucket: process.env.GCS_BUCKET_PRODUCTION
    }
  }
};
```

### 7.3 Monitoring & Alerting

```hcl
# terraform/modules/monitoring/main.tf
resource "google_monitoring_alert_policy" "app_health" {
  display_name = "${var.environment} App Health Alert"
  combiner     = "OR"
  
  conditions {
    display_name = "App Instance Down"
    
    condition_threshold {
      filter         = "resource.type=\"gce_instance\""
      comparison     = "COMPARISON_LESS_THAN"
      threshold_value = 1
      duration       = "300s"
      
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }
  
  notification_channels = [var.notification_channel_id]
}
```

---

## 8. Implementation Checklist

### Phase 1: Repository Migration
- [ ] Extract `mastra-test-app` with git history using `git subtree`
- [ ] Create new repository on GitHub
- [ ] Push extracted code to new repository
- [ ] Verify git history preservation
- [ ] Update repository settings and permissions

### Phase 2: CI/CD Setup
- [ ] Create GitHub Actions workflows (CI, CD, Security)
- [ ] Set up branch protection rules
- [ ] Configure secrets and environment variables
- [ ] Set up code coverage reporting
- [ ] Configure automated dependency updates

### Phase 3: Infrastructure Setup
- [ ] Create GCP project and enable required APIs
- [ ] Set up Terraform state backend (GCS)
- [ ] Implement Terraform modules
- [ ] Deploy development environment
- [ ] Deploy staging environment
- [ ] Deploy production environment

### Phase 4: Database & Storage
- [ ] Set up Cloud SQL instances for each environment
- [ ] Configure automated backups
- [ ] Set up read replicas for production
- [ ] Create GCS buckets with proper lifecycle policies
- [ ] Implement database migration pipeline

### Phase 5: Monitoring & Security
- [ ] Set up Google Cloud Operations (formerly Stackdriver)
- [ ] Configure alerting policies
- [ ] Implement security scanning
- [ ] Set up log aggregation
- [ ] Configure performance monitoring

### Phase 6: Documentation & Training
- [ ] Update README with new deployment procedures
- [ ] Create runbooks for common operations
- [ ] Document troubleshooting procedures
- [ ] Train team on new deployment process

---

## Estimated Timeline

- **Phase 1 (Migration)**: 1-2 days
- **Phase 2 (CI/CD)**: 3-5 days
- **Phase 3 (Infrastructure)**: 5-7 days
- **Phase 4 (Database/Storage)**: 3-4 days
- **Phase 5 (Monitoring)**: 2-3 days
- **Phase 6 (Documentation)**: 2-3 days

**Total Estimated Time**: 16-24 days

---

## Cost Considerations

### Monthly Cost Estimates (USD)

#### Development Environment
- GCE (e2-micro): ~$6/month
- Cloud SQL (db-f1-micro): ~$7/month
- GCS Storage (100GB): ~$2/month
- **Total**: ~$15/month

#### Staging Environment
- GCE (2x e2-standard-2): ~$60/month
- Cloud SQL (db-custom-2-8192): ~$150/month
- GCS Storage (500GB): ~$10/month
- Load Balancer: ~$18/month
- **Total**: ~$238/month

#### Production Environment
- GCE (3x e2-standard-4 + autoscaling): ~$200-400/month
- Cloud SQL (Regional HA): ~$400/month
- GCS Storage (Multi-region, 2TB): ~$50/month
- Load Balancer: ~$18/month
- Monitoring & Logging: ~$50/month
- **Total**: ~$718-968/month

---

This specification provides a comprehensive roadmap for migrating your `mastra-test-app` to a production-ready infrastructure with proper CI/CD, monitoring, and scalability considerations.
