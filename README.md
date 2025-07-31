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

## Step-by-Step Setup

### 1. Get the Code
```bash
# Clone the repository
git clone https://github.com/navapbc/labs-asp-experiments.git
cd labs-asp-experiments/mastra-test-app
```

### 2. Install Dependencies
```bash
# Install all required packages
pnpm install
```

### 3. Set Up Environment Variables

Create a `.env` file in the root folder with your API keys:

```env
# Required API Keys (ask your team lead for these)
OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
EXA_API_KEY=your_exa_key_here

# Database connection (ask your team lead for the DATABASE_URL)
DATABASE_URL="{your_database_url_here}"
```

> **Note**: The database is already set up in the cloud, so you just need the connection string!

### 4. Database Connection

> **Important**: The database is already set up and populated with test data! As a team member, you only need to connect to it. **Please don't run migration or seeding commands**, these are reserved for admins to avoid accidentally modifying shared data.

The database is ready to use with sample participant data already loaded. You'll be able to see this data once you start the app!

### 5. Start the App
```bash
# Launch the Mastra playground
pnpm dev
```

**Success!** The app should now be running. You'll see a URL in your terminal (usually `http://localhost:4001`): click it to open the playground!

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
# Start the app
pnpm dev

# View database (read-only)
pnpm db:studio
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

---

**Ready to explore AI automation? Start with `pnpm dev` and have fun!** 