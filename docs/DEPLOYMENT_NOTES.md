# Mastra Test App - GCE Deployment Guide

## Overview
Complete guide for deploying mastra-test-app to Google Compute Engine with headless Playwright MCP support.

## Prerequisites
- Google Cloud account with billing enabled
- API keys for: OpenAI, Anthropic, Exa
- Local environment with git and terminal access

## Deployment Progress

### ✅ Completed Steps
- **Step 1**: Google Cloud CLI Setup (v533.0.0)
  - Authenticated as: foadgreen@navapbc.com
  - Project: nava-labs
  - Billing verified: enabled
  - Compute Engine API: enabled

- **Step 2**: GCE Instance Created
  - **Instance Name**: mastra-app
  - **Zone**: us-west1-a (Oregon)
  - **External IP**: 34.82.220.178
  - **Internal IP**: 10.138.0.2
  - **Status**: RUNNING
  - **Firewall**: Port 4111 open (allow-mastra-app rule)

- **Step 3**: Server Dependencies Installed  
  - **System**: Updated Ubuntu 22.04 LTS
  - **Node.js**: v20.19.4 (installed via NodeSource)
  - **pnpm**: v10.14.0 (installed globally with sudo)
  - **SSH**: Connected and working

### 🔄 Current Status: Debugging Prisma Import Issue
- ✅ Repository cloned to server
- ✅ Project dependencies installed with pnpm  
- ✅ Environment variables configured
- ✅ Application built successfully
- ❌ **Issue**: Prisma client ESM import error in bundled output

**Current Error**:
```
SyntaxError: Named export 'PrismaClient' not found. The requested module '@prisma/client' is a CommonJS module
```

### Next Steps
- Fix Prisma import compatibility issue
- Start application successfully
- Test external access

### 📝 Actual Commands Used
```bash
# What we actually ran vs. the guide:

# Step 1 - Local machine
gcloud init  # Selected project: nava-labs
gcloud services enable compute.googleapis.com
gcloud billing projects describe nava-labs  # Verified enabled

# Step 2 - Instance creation (corrected Ubuntu version)
gcloud compute instances create mastra-app \
  --zone=us-west1-a \
  --machine-type=e2-standard-2 \
  --image-family=ubuntu-2204-lts \  # Note: Had to use 2204 instead of 2004
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=20GB \
  --boot-disk-type=pd-standard \
  --tags=mastra-app,http-server,https-server

# Firewall rule
gcloud compute firewall-rules create allow-mastra-app \
  --allow tcp:4111 \
  --source-ranges 0.0.0.0/0 \
  --target-tags mastra-app

# Step 3 - On server (after SSH connection)
sudo apt-get update
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pnpm  # Note: Required sudo for global install
node --version  # v20.19.4
pnpm --version  # 10.14.0

# Step 4 - Deploy application
git clone https://github.com/navapbc/labs-asp-experiments.git
cd labs-asp-experiments/mastra-test-app
pnpm install  # Installed 683 packages

# Create .env file (with actual API keys)
cat > .env << 'EOF'
OPENAI_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here  
EXA_API_KEY=your_key_here
DATABASE_URL=your_database_url_here
NODE_ENV=production
EOF

# Generate Prisma client and build
npx prisma generate
pnpm build  # Successful build

# Issue encountered: Prisma ESM import error
# pnpm start fails with CommonJS/ESM compatibility issue
```

## Step 1: Google Cloud CLI Setup

### 1.1 Install Google Cloud CLI

**macOS (using Homebrew):**
```bash
brew install google-cloud-sdk
```

**Linux/Ubuntu:**
```bash
echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | sudo tee -a /etc/apt/sources.list.d/google-cloud-sdk.list
curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key --keyring /usr/share/keyrings/cloud.google.gpg add -
sudo apt-get update && sudo apt-get install google-cloud-cli
```

### 1.2 Initialize and Authenticate
```bash
# Initialize gcloud (opens browser for authentication)
gcloud init

# Verify setup
gcloud --version
gcloud auth list
gcloud config list
```

### 1.3 Enable Required APIs
```bash
# Enable Compute Engine API
gcloud services enable compute.googleapis.com

# Verify billing is enabled
gcloud billing projects describe YOUR_PROJECT_ID
```

## Step 2: Create GCE Instance

### 2.1 Instance Creation
```bash
gcloud compute instances create mastra-app \
  --zone=us-west1-a \
  --machine-type=e2-standard-2 \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=20GB \
  --boot-disk-type=pd-standard \
  --tags=mastra-app,http-server,https-server
```

### 2.2 Configure Firewall Rules
```bash
# Allow app port (adjust port based on your app configuration)
gcloud compute firewall-rules create allow-mastra-app \
  --allow tcp:4111 \
  --source-ranges 0.0.0.0/0 \
  --target-tags mastra-app
```

## Step 3: Server Setup

### 3.1 Connect to Instance
```bash
gcloud compute ssh mastra-app --zone=us-west1-a
```

### 3.2 Install Dependencies
```bash
# Update system
sudo apt-get update

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install pnpm (requires sudo for global install)
sudo npm install -g pnpm

# Verify installations
node --version  # Should be v20.x.x
pnpm --version
```

## Step 4: Deploy Application

### 4.1 Clone Repository
```bash
# Clone your repo (replace with your actual repo URL)
git clone https://github.com/navapbc/labs-asp-experiments.git
cd labs-asp-experiments/mastra-test-app
```

### 4.2 Install Dependencies
```bash
pnpm install
```

### 4.3 Environment Configuration
```bash
# Create .env file with your API keys
cat > .env << EOF
OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
EXA_API_KEY=your_exa_key_here
DATABASE_URL=your_database_url_here
NODE_ENV=production
EOF
```

### 4.4 Start Application
```bash
# Test run
pnpm start

# For production, consider using a process manager like PM2
npm install -g pm2
pm2 start "pnpm start" --name mastra-app
pm2 startup  # Configure auto-start on boot
pm2 save
```

## Step 5: Verification

### 5.1 Check Application Status
```bash
# If using PM2
pm2 status

# Check if app is responding
curl http://localhost:4111/health  # Adjust endpoint as needed
```

### 5.2 External Access
```bash
# Get external IP of your instance
gcloud compute instances describe mastra-app --zone=us-west1-a --format='get(networkInterfaces[0].accessConfigs[0].natIP)'

# Test external access (replace with actual IP)
curl http://YOUR_EXTERNAL_IP:4111/health
```

## Configuration Details

### Application Architecture
- **App**: mastra-test-app
- **Node Version**: >=20.9.0 (from package.json)
- **Package Manager**: pnpm
- **MCP Config**: Uses @playwright/mcp@latest with --isolated flag
- **Default Port**: 4111 (adjustable via mastra configuration)

### Key Technical Notes
- **Playwright MCP**: Browser automation handled by `@playwright/mcp@latest` 
- **No Playwright Installation**: MCP server manages browser dependencies automatically
- **Headless Mode**: `--isolated` flag runs headless by default (perfect for servers)
- **Database**: Uses existing PostgreSQL (Neon) connection from .env

### Instance Specifications
- **Machine Type**: e2-standard-2 (2 vCPUs, 8GB RAM)
- **OS**: Ubuntu 22.04 LTS
- **Disk**: 20GB standard persistent disk
- **Zone**: us-west1-a (Oregon region)

## Troubleshooting

### Common Issues
```bash
# Check app logs
pm2 logs mastra-app

# Restart application
pm2 restart mastra-app

# Check firewall rules
gcloud compute firewall-rules list --filter="name~allow-mastra"

# Check instance status
gcloud compute instances list --filter="name=mastra-app"
```

### Port Configuration
If your app uses a different port, update the firewall rule:
```bash
gcloud compute firewall-rules update allow-mastra-app --allow tcp:YOUR_PORT
```