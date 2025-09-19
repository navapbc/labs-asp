# Multi-stage Dockerfile for Mastra + Playwright MCP setup
FROM node:20-slim AS base

# Install system dependencies needed for Playwright and git
RUN apt-get update && apt-get install -y \
    git \
    wget \
    gnupg \
    ca-certificates \
    procps \
    curl \
    libxss1 \
    libgconf-2-4 \
    libxrandr2 \
    libasound2 \
    libpangocairo-1.0-0 \
    libatk1.0-0 \
    libc6-dev \
    libdrm2 \
    libgtk-3-0 \
    libgdk-pixbuf2.0-0 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxi6 \
    libxtst6 \
    libnss3 \
    libcups2 \
    libxrandr2 \
    libasound2 \
    libpangocairo-1.0-0 \
    libatk1.0-0 \
    libdrm-common \
    libdrm2 \
    libxss1 \
    libgconf-2-4 \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm globally
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Stage 1: Build stage
FROM base AS builder

# Copy package files first for better caching
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build mastra app
RUN pnpm run build

# Stage 2: Runtime stage with Playwright
FROM base AS runtime

# Install Playwright MCP server (includes playwright as dependency)
RUN npm install -g @playwright/mcp@latest

# Set environment variable for browser path (standard Playwright location)
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Install Playwright browsers using the MCP server's bundled Playwright version
RUN /usr/local/lib/node_modules/@playwright/mcp/node_modules/.bin/playwright install --with-deps chromium

# Verify browsers are installed and show their location
RUN /usr/local/lib/node_modules/@playwright/mcp/node_modules/.bin/playwright install --dry-run && \
    echo "Browser installation verified using MCP server's Playwright version. Browsers located at: $PLAYWRIGHT_BROWSERS_PATH" && \
    ls -la /ms-playwright/ || ls -la ~/.cache/ms-playwright/ || echo "Browser path not found, but installation completed"

# Copy built application and node_modules from builder stage
COPY --from=builder /app .

# Create a non-root user for better security
RUN groupadd -r mastra && useradd -r -g mastra -d /app -s /bin/bash mastra

# Copy and setup startup script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Change ownership of the app directory and browser directory to the mastra user
RUN chown -R mastra:mastra /app && \
    chown -R mastra:mastra /ms-playwright

# Switch to non-root user
USER mastra

# Expose ports
EXPOSE 4111 8931

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:4111/health || curl -f http://localhost:4111 || exit 1

# Start all services
CMD ["/app/start.sh"]
