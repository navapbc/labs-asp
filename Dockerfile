# Dockerfile for Mastra app
FROM node:25-slim AS base

# Install basic system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    ca-certificates \
    procps \
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

# Stage 2: Runtime stage
FROM base AS runtime

# Copy built application and node_modules from builder stage
COPY --from=builder /app .

# Create a non-root user for better security
RUN groupadd -r mastra && useradd -r -g mastra -d /app -s /bin/bash mastra

# Change ownership of the app directory to the mastra user
RUN chown -R mastra:mastra /app

# Switch to non-root user
USER mastra

# Expose Mastra port only
EXPOSE 4112

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:4112/health || exit 1

# Start Mastra server
WORKDIR /app
CMD ["npx", "mastra", "dev"]
