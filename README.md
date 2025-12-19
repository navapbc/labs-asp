# Mastra Test App Quick Setup Guide

Welcome! This guide will help you get the Mastra test app running on your computer in just a few steps. The database is already set up in the cloud, so you'll just be connecting to it!

## What You'll Have After Setup

- **AI Agents**: Smart assistants that can help with web automation
- **Web Automation**: AI that can visit websites and extract information
- **Database**: A cloud database with sample participant data for testing
- **Playground**: A web interface to interact with all the AI features

## Prerequisites

You'll need these installed on your computer:

- **Node.js** (version 20 or higher): [Download here](https://nodejs.org/)
- **pnpm**: Install by running: `npm install -g pnpm`
- **Docker Desktop**: [Download here](https://www.docker.com/products/docker-desktop/) - Required for running the full stack locally
- **gcloud CLI** (optional): [Install instructions](https://cloud.google.com/sdk/docs/install) - Only needed if working with GCP resources directly

> **Note**: We use the `develop` branch as our primary working branch. Make sure to checkout `develop` after cloning.

## Step-by-Step Setup

### 1. Get the Code with Submodules

This project uses Git submodules to manage the client frontend. You'll need to clone with submodules or set them up after cloning.

#### Option A: Clone with Submodules (Recommended)
```bash
# Clone the repository with submodules
git clone --recurse-submodules https://github.com/navapbc/labs-asp.git
cd labs-asp

# Switch to the develop branch (our primary working branch)
git checkout develop
```

#### Option B: If You Already Cloned Without Submodules
```bash
# If you already cloned the repo, initialize submodules
git submodule update --init --recursive
```

> **Important**: This project uses the `client/` directory as a Git submodule that tracks the `labs-asp` branch of the AI chatbot repository.

### 2. Opening Terminal in Visual Studio Code

If you're using Visual Studio Code:

1. **Open the project folder**: Go to `File > Open Folder` and select the `labs-asp` directory
2. **Open the terminal**: 
   - Use the keyboard shortcut: `Ctrl+(backtick)` on Mac
   - Or go to `Terminal > New Terminal` in the menu
   - Or use `View > Terminal`

The terminal should automatically open in the correct `labs-asp` directory. You can verify this by running `pwd` (on Mac) to see your current directory path.

### 3. Install Dependencies
```bash
# Install all required packages
pnpm install
```

### 4. Set Up Environment Variables

You'll need to create three configuration files. Ask your team lead for access to the 1Password secure notes containing the actual values.

#### Root `.env` file
```bash
cp .env.example .env
```
Then update the values with the contents from the 1Password secure note shared by your team lead.

#### Client `.env.local` file
```bash
cp client/.env.example client/.env.local
```
Then update the values with the contents from the 1Password secure note for the client environment.

> **Important**: If your `client/.env.local` contains a `BROWSER_WS_PROXY_URL` line, make sure it is **commented out** for local development:
> ```
> # BROWSER_WS_PROXY_URL=http://localhost:8080
> ```

#### Vertex AI Credentials
```bash
touch vertex-ai-credentials.json
```
Copy the service account JSON from the 1Password secure note. See `docs/VERTEX_AI_ANTHROPIC_SETUP.md` for details on creating your own credentials if needed.

> **Warning about 1Password**: When copying from 1Password secure notes, ensure you're copying the **raw text** and not a markdown-rendered version. 1Password can convert files to markdown, which breaks commented lines (e.g., `# comment` becomes a heading). If you encounter unexpected behavior, verify your file contents match the original format.

### 5. Database Connection

> **Important**: The database is already set up and populated with test data! As a team member, you only need to connect to it. **Please don't run migration or seeding commands**, these are reserved for admins to avoid accidentally modifying shared data.

The database is ready to use with sample participant data already loaded. You'll be able to see this data once you start the app!

### 6. Start the App

#### Option A: Docker Compose (Recommended for Full Stack)
```bash
# Build and start all services
docker compose up -d --build
```

This starts the complete stack including the AI chatbot client, Mastra backend, and browser streaming service. Access the app at `http://localhost:3000`.

#### Option B: Local Development (Mastra Playground Only)
```bash
# Launch the Mastra playground
pnpm dev
```

This starts only the Mastra playground at `http://localhost:4111`.

**Success!** The app should now be running. Click the URL in your terminal to open it!

## What Can You Do Now?

### Try the AI Agents
- **Weather Agent**: Ask about weather in any city
- **Web Automation Agent**: Have it visit websites and take screenshots
- **Memory Agent**: Store and retrieve information

### Sample Prompts to Try
- "What's the weather like in San Francisco?"
- "Visit google.com and take a screenshot"
- "Remember that our team meeting is every Tuesday at 2 PM"

### View Your Database
```bash
# Open database browser
pnpm db:studio
```
This opens a web interface at `http://localhost:5555` where you can browse the shared participant data (read-only).

## If Something Goes Wrong

### App Frontend Errors or Won't Start

If the app displays errors or becomes unresponsive:

1. **Stop the current process**:
   - In your terminal, press `Ctrl+C` (Mac) to stop the running process
   - If that doesn't work, close the entire terminal session:
     - In VS Code: Click the trash can icon in the terminal panel, or right-click the terminal tab and select "Kill Terminal"

2. **Start fresh**:
   - Open a new terminal (see "Opening Terminal in Visual Studio Code" above)
   - Make sure you're in the `labs-asp` directory: `cd labs-asp`
   - Restart the app: `pnpm dev`

3. **If problems persist**:
   - Try clearing the cache: `pnpm clean` (if available) and run `pnpm install` again
   - Check that all environment variables are correctly set in your `.env` file

### Docker Troubleshooting

#### Full Rebuild (Clean Slate)
If you're seeing stale behavior or containers aren't syncing properly:
```bash
docker compose down && docker compose build --no-cache && docker compose up -d
```
> **Note**: This may take 5-10 minutes to rebuild all images from scratch.

#### Quick Client Rebuild
For client-side changes only (faster than full Docker rebuild):
```bash
cd client && pnpm build && pnpm dev
```
This starts the client on `http://localhost:3001` while still connecting to the Dockerized backend.

#### View Container Logs
```bash
# All containers
docker compose logs -f

# Specific container
docker logs --tail 100 labs-asp-browser-streaming-1
```

### Database Connection Issues
- Make sure you have the correct `DATABASE_URL` in your `.env` file
- Contact your team lead if you're getting database connection errors

### Missing API Keys
- Contact your team lead for the required API keys
- Make sure they're properly copied into your `.env` file

### Need Fresh Data?
Contact your team lead if you need the database refreshed regular team members shouldn't modify the shared database.

## Quick Reference Commands

```bash
# Start full stack with Docker (recommended)
docker compose up -d --build

# Start Mastra playground only
pnpm dev

# View database (read-only)
pnpm db:studio

# Full Docker rebuild
docker compose down && docker compose build --no-cache && docker compose up -d

# View Docker logs
docker compose logs -f
```

## Git Submodule Management

This project uses Git submodules to manage the client frontend. The `client/` directory is a submodule that tracks the `labs-asp` branch of the AI chatbot repository.

### Initial Setup (One-Time Configuration)

Set up Git to automatically handle submodules and create a convenient alias:

```bash
# Configure Git to automatically handle submodules in most operations
git config --global submodule.recurse true

# Create an alias for pulling with submodules
git config --global alias.spull "pull --recurse-submodules"
```

### Daily Workflow Commands

```bash
# Pull latest changes from both main repo and submodules
git spull

# Alternative: Pull with submodules (if you don't have the alias)
git pull --recurse-submodules

# Update submodule to latest commit from its remote branch
git submodule update --remote client

# Check submodule status
git submodule status

# Initialize submodules if they're missing
git submodule update --init --recursive
```

### Working with Submodules

#### After a PR is Merged
When PRs are merged into the main repository, always pull with submodules:
```bash
git spull  # Pulls both main repo and submodule changes automatically
```

#### If You Need to Update the Submodule Reference
Sometimes you'll need to update the main repository to point to a newer commit in the submodule:
```bash
# Update submodule to latest remote commit
git submodule update --remote client

# Add and commit the submodule reference update
git add client
git commit -m "feat: update client submodule to latest commit"
git push
```

#### Checking Submodule Configuration
You can view the submodule configuration in `.gitmodules`:
```bash
cat .gitmodules
```

This shows how the submodule is configured to track the `labs-asp` branch.

### Troubleshooting Submodules

#### Submodule Directory is Empty
```bash
git submodule update --init --recursive
```

#### Submodule is Out of Date
```bash
git submodule update --remote client
```

#### Reset Submodule to Match Main Repository
```bash
git submodule update --recursive
```

#### View What Branch the Submodule is Tracking
```bash
git config -f .gitmodules --get submodule.client.branch
```

### Admin-Only Commands
> **Note**: These commands are for admins only and will modify shared data:
```bash
# Add sample data (admin only)
pnpm seed:wic

# Reset everything (admin only)
pnpm db:reset

# Create migrations (admin only)
pnpm db:migrate
```

## Learn More

- **Detailed Database Guide**: See `DATABASE_SETUP.md`
- **Web Automation Features**: See `PLAYWRIGHT_MCP_GUIDE.md`
- **Need Help?**: Ask your team lead or create an issue
