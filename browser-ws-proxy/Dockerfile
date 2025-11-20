# WebSocket Proxy Dockerfile
FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy server code
COPY server.js ./

# Expose port (Cloud Run will set PORT env var)
EXPOSE 8080

# Run as non-root user
USER node

# Start server
CMD ["node", "server.js"]
