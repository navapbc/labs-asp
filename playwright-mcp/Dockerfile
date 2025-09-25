# Independent Playwright MCP Server Container
FROM node:20-slim

# Install system dependencies needed for Playwright
RUN apt-get update && apt-get install -y \
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
    && rm -rf /var/lib/apt/lists/*

# Install Playwright MCP server globally
RUN npm install -g @playwright/mcp@latest

# Set environment variable for browser path
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Install Playwright browsers using the MCP server's bundled version
RUN /usr/local/lib/node_modules/@playwright/mcp/node_modules/.bin/playwright install --with-deps chromium

# Verify browser installation
RUN /usr/local/lib/node_modules/@playwright/mcp/node_modules/.bin/playwright install --dry-run && \
    echo "Browser installation verified. Browsers located at: $PLAYWRIGHT_BROWSERS_PATH"

# Create a non-root user for security
RUN groupadd -r playwright && useradd -r -g playwright -d /app -s /bin/bash playwright

# Create app directory and set ownership
RUN mkdir -p /app && chown -R playwright:playwright /app && \
    chown -R playwright:playwright /ms-playwright

# Copy browser streaming server and startup script
COPY browser-streaming-server.js /app/browser-streaming-server.js
COPY start-services.sh /app/start-services.sh

# Make startup script executable and set ownership
RUN chmod +x /app/start-services.sh && chown playwright:playwright /app/start-services.sh /app/browser-streaming-server.js

# Switch to non-root user
USER playwright

# Set working directory
WORKDIR /app

# Expose MCP server port and browser streaming port
EXPOSE 8931 8933

# Start both services
CMD ["/app/start-services.sh"]
