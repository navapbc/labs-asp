# Multi-stage Dockerfile for Labs ASP
# Optimized for Cloud Run deployment with Playwright MCP support

# Build stage
FROM node:20-bullseye-slim AS builder

# Install system dependencies needed for building
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install pnpm (match local version)
RUN npm install -g pnpm@10

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm build

# Production stage
FROM node:20-bullseye-slim AS production

# Install system dependencies for Playwright and Chrome
RUN apt-get update && apt-get install -y \
    # Chrome dependencies
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxss1 \
    libgconf-2-4 \
    libxcomposite1 \
    libasound2 \
    libxtst6 \
    libxrandr2 \
    libgbm1 \
    libxkbcommon0 \
    libgtk-3-0 \
    # Additional utilities
    curl \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxss1 \
    lsb-release \
    xdg-utils \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install pnpm (match local version)
RUN npm install -g pnpm@10

# Install production dependencies only (handle lockfile compatibility)
RUN pnpm install --frozen-lockfile --prod || pnpm install --prod

# Install Playwright MCP globally (Phase 1 approach)
RUN npm install -g @playwright/mcp@latest

# Copy built application from builder stage (.mastra/output is the correct build directory)
COPY --from=builder /app/.mastra/output ./.mastra/output
COPY --from=builder /app/migrations ./migrations

# Create non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser -m appuser
RUN chown -R appuser:appuser /app
USER appuser

# Expose the port the app runs on
EXPOSE 4111

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:4111/health || exit 1

# Environment variables
ENV NODE_ENV=production
ENV PORT=4111
ENV HOST=0.0.0.0

# Build arguments
ARG GITHUB_SHA
ARG NODE_ENV=production
ENV GITHUB_SHA=${GITHUB_SHA}

# Start the application
# Phase 1: Run Mastra server with native Node.js (no Docker sidecar complexity)
# Use the official Mastra build output with telemetry instrumentation
CMD ["node", "--import=./.mastra/output/instrumentation.mjs", ".mastra/output/index.mjs"]
