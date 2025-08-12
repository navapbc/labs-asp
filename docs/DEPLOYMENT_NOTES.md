## Mastra Test App — GCE Deployment (Methods)

This guide provides an exact, copy‑pasteable sequence to deploy `mastra-test-app` on a Google Compute Engine VM, including headless Playwright MCP support.

### Prerequisites
- Google Cloud project with billing enabled
- `gcloud` CLI installed and authenticated
- API keys: OpenAI, Anthropic, Exa
- PostgreSQL connection URL (Neon or other)

---

### 1) Create the VM and open the app port
```bash
# Enable Compute Engine API
gcloud services enable compute.googleapis.com

# Create VM (Ubuntu 22.04 LTS)
gcloud compute instances create mastra-app \
  --zone=us-west1-a \
  --machine-type=e2-standard-2 \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=20GB \
  --boot-disk-type=pd-standard \
  --tags=mastra-app,http-server,https-server

# Allow inbound traffic to the app (port 4111)
gcloud compute firewall-rules create allow-mastra-app \
  --allow tcp:4111 \
  --source-ranges 0.0.0.0/0 \
  --target-tags mastra-app
```

### 2) SSH into the VM
```bash
gcloud compute ssh mastra-app --zone=us-west1-a
```

### 3) Install Node.js 20 and pnpm
```bash
sudo apt-get update
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pnpm

node --version   # should be v20.x
pnpm --version
```

### 4) Clone the repository and install deps
```bash
git clone https://github.com/navapbc/labs-asp-experiments.git
cd labs-asp-experiments/mastra-test-app
pnpm install
```

### 5) Configure environment
Create `.env` in the project root with required variables:
```bash
cat > .env << 'EOF'
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
EXA_API_KEY=your_exa_key
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require

# Required for auth middleware
MASTRA_JWT_SECRET=replace_with_a_strong_random_secret
MASTRA_APP_PASSWORD=replace_with_a_login_password

# Playwright artifacts - automatically configured based on environment
# Local development: uses /tmp/playwright-artifacts
# Production: uses GCS_MOUNT_PATH (set in step 6)

NODE_ENV=production
EOF
```

### 6) Set up GCS Bucket for Artifacts
```bash
# Create GCS bucket for artifacts (if not already created)
gsutil mb gs://benefits-automation-artifacts || echo "Bucket already exists"

# Install gcsfuse to mount bucket as filesystem
export GCSFUSE_REPO=gcsfuse-`lsb_release -c -s`
echo "deb https://packages.cloud.google.com/apt $GCSFUSE_REPO main" | sudo tee /etc/apt/sources.list.d/gcsfuse.list
curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key add -
sudo apt-get update
sudo apt-get install -y gcsfuse

# Create mount point and mount bucket
sudo mkdir -p /mnt/playwright-artifacts
sudo gcsfuse benefits-automation-artifacts /mnt/playwright-artifacts

# Set ownership for your user
sudo chown -R $USER:$USER /mnt/playwright-artifacts

# Add to .env for production environment
echo "GCS_MOUNT_PATH=/mnt/playwright-artifacts" >> .env

# Set up automatic mounting on boot (optional but recommended)
echo "benefits-automation-artifacts /mnt/playwright-artifacts gcsfuse rw,user" | sudo tee -a /etc/fstab
```

### 7) Build and (optionally) apply migrations
```bash
# Build the app and prepare Prisma client in the output
pnpm build

# If your database is new or migrations need to be applied
npx prisma migrate deploy
```

### 8) Start the application
```bash
pnpm start
```

The server listens on `0.0.0.0:4111`. In another terminal:
```bash
EXTERNAL_IP=$(gcloud compute instances describe mastra-app \
  --zone=us-west1-a \
  --format='get(networkInterfaces[0].accessConfigs[0].natIP)')
echo "http://$EXTERNAL_IP:4111/auth/login"
```

Optional: keep it running with PM2
```bash
sudo npm install -g pm2
pm2 start "pnpm start" --name mastra-app
pm2 startup && pm2 save
```

---

### Notes
- Playwright MCP is launched via `npx @playwright/mcp@latest --isolated`; no separate Playwright install is required.
- Default host/port are set in code to `0.0.0.0:4111` (see `src/mastra/index.ts`).
- Auth-protected UI is served at `/auth/login` and the Web Automation Agent playground at `/agents/webAutomationAgent/chat/` after login.

### Artifact Storage
- **Local Development**: Artifacts saved to `./artifacts/` in your project directory (user-friendly)
- **Production (GCE)**: Artifacts saved directly to GCS bucket via mounted filesystem
- **Automatic Detection**: Code automatically detects environment and uses appropriate storage
- **Real-time**: Files appear in GCS immediately when created (no upload delays)
- **Cross-Platform**: Same codebase works locally and on VM without changes

### Troubleshooting
- Prisma client errors: ensure you ran `pnpm build`. If needed, run `npx prisma generate` once, then `pnpm build` again.
- Firewall: verify with `gcloud compute firewall-rules list --filter="name~allow-mastra-app"`.
- Logs: if using PM2, run `pm2 logs mastra-app`; otherwise, observe terminal output from `pnpm start`.