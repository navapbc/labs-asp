FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install pnpm
RUN corepack enable pnpm

# Install dependencies
COPY package.json pnpm-lock.yaml* ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build arguments for deployment info
ARG DEPLOYMENT_ID
ARG ENVIRONMENT

ENV DEPLOYMENT_ID=$DEPLOYMENT_ID
ENV ENVIRONMENT=$ENVIRONMENT
ENV NODE_ENV=production

# Enable pnpm and build the application (which now includes Prisma post-build)
RUN corepack enable pnpm

# Generate Prisma client explicitly before building
RUN pnpm prisma generate

# Build the application
RUN pnpm build

# Production image, copy all the files and run the app
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 mastra

# Install pnpm in the runner stage
RUN corepack enable pnpm

# Copy the built application from Mastra output
COPY --from=builder --chown=mastra:nodejs /app/.mastra/output ./.mastra/output
COPY --from=builder --chown=mastra:nodejs /app/package.json ./package.json
COPY --from=builder --chown=mastra:nodejs /app/prisma ./prisma

# Copy node_modules 
COPY --from=builder --chown=mastra:nodejs /app/node_modules ./node_modules

# Copy prisma schema to Mastra output directory as well (needed for runtime generation)
COPY --from=builder --chown=mastra:nodejs /app/prisma ./.mastra/output/prisma

# Ensure Prisma client is generated in the final stage
RUN pnpm prisma generate

# Generate Prisma client for the Mastra output directory using the correct schema path
RUN pnpm prisma generate --schema=./.mastra/output/prisma/schema.prisma

# The Prisma client should now be available both in node_modules and .mastra/output/

# Ensure mastra user owns the entire /app directory
RUN chown -R mastra:nodejs /app

USER mastra

EXPOSE 8080

ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

# Add deployment info as environment variables
ARG DEPLOYMENT_ID
ARG ENVIRONMENT
ENV DEPLOYMENT_ID=$DEPLOYMENT_ID
ENV ENVIRONMENT=$ENVIRONMENT

# Health check - use PORT environment variable
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 8080) + '/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "--import=./.mastra/output/instrumentation.mjs", ".mastra/output/index.mjs"]
