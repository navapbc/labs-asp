## Mastra Test App — GCE Deployment (Methods)

This guide provides an exact, copy‑pasteable sequence to deploy `mastra-test-app` on a Google Compute Engine VM, including headless Playwright MCP support.

### Prerequisites
- Google Cloud project with billing enabled
- `gcloud` CLI installed and authenticated
- API keys: OpenAI, Anthropic, Exa
- GCP Cloud SQL PostgreSQL database (see [GCP_POSTGRESQL_SETUP.md](./GCP_POSTGRESQL_SETUP.md))

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

### 5) Authorize VM IP for database access
```bash
# Get the VM's external IP
EXTERNAL_IP=$(gcloud compute instances describe mastra-app \
  --zone=us-west1-a \
  --format='get(networkInterfaces[0].accessConfigs[0].natIP)')

echo "VM External IP: $EXTERNAL_IP"

# Add VM IP to Cloud SQL authorized networks (replace existing IPs as needed)
gcloud sql instances patch app-dev --authorized-networks=$EXTERNAL_IP
```

### 6) Configure environment
Create `.env` in the project root with required variables:
```bash
cat > .env << 'EOF'
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
EXA_API_KEY=your_exa_key

# GCP Cloud SQL PostgreSQL (update with your actual values)
DATABASE_URL="postgresql://app_user:your_password@your_db_ip/app_db?sslmode=disable"

# CORS Configuration (replace YOUR_VM_IP with actual external IP)
CORS_ORIGINS="http://localhost:4111,http://0.0.0.0:4111,http://YOUR_VM_IP:4111,*"

# Required for auth middleware
MASTRA_JWT_SECRET=replace_with_a_strong_random_secret
MASTRA_APP_PASSWORD=replace_with_a_login_password

NODE_ENV=production
EOF
```

**Note:** For production, consider using `sslmode=require` with proper SSL certificates instead of `sslmode=disable`.

### 7) Build and apply migrations
```bash
# Build the app and prepare Prisma client in the output
pnpm build

# Apply database migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

### 8) Start the application

#### Option A: Development/Testing (foreground)
```bash
pnpm dev
```

#### Option B: Production/Persistent (with PM2)
```bash
# Install PM2 globally
sudo npm install -g pm2

# Start the app with PM2 as root (system-wide, accessible to all users)
sudo pm2 start "pnpm dev" --name app-playground --user $(whoami)

# Useful PM2 commands (use sudo for system-wide processes):
sudo pm2 list                    # View all processes
sudo pm2 logs app-playground     # View logs
sudo pm2 restart app-playground  # Restart the app
sudo pm2 stop app-playground     # Stop the app
sudo pm2 delete app-playground   # Remove from PM2

# Auto-restart PM2 processes on system reboot (run as root)
sudo pm2 startup
sudo pm2 save
```

The server listens on `0.0.0.0:4111`. In another terminal:
```bash
EXTERNAL_IP=$(gcloud compute instances describe mastra-app \
  --zone=us-west1-a \
  --format='get(networkInterfaces[0].accessConfigs[0].natIP)')
echo "http://$EXTERNAL_IP:4111/auth/login"
```

---

### Notes
- Playwright MCP is launched via `npx @playwright/mcp@latest --isolated`; no separate Playwright install is required.
- Default host/port are set in code to `0.0.0.0:4111` (see `src/mastra/index.ts`).
- Auth-protected UI is served at `/auth/login` and the Web Automation Agent playground at `/agents/webAutomationAgent/chat/` after login.

### Troubleshooting
- **Prisma client errors:** ensure you ran `pnpm build`. If needed, run `npx prisma generate` once, then `pnpm build` again.
- **Firewall issues:** verify with `gcloud compute firewall-rules list --filter="name~allow-mastra-app"`.
- **Database connection:** check that VM IP is authorized in Cloud SQL and `.env` has correct DATABASE_URL.
- **Logs:** 
  - PM2: `pm2 logs app-playground`
  - Foreground: observe terminal output from `pnpm dev`
- **PM2 process management:**
  - Check status: `pm2 status`
  - Restart if needed: `pm2 restart app-playground`
  - Clear logs: `pm2 flush`