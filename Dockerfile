# Multi-stage Dockerfile for TrustVault Production Deployment
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root manifest and workspace manifests
COPY package.json ./
COPY server/package.json server/
COPY client/package.json client/

# Install dependencies
RUN npm install

# Copy source trees and Prisma definitions
COPY server/ server/
COPY client/ client/

# Generate Prisma client and build both workspaces
RUN npm run prisma:generate --workspace=server
RUN npm run build

# Stage 2: Minimal Production Runtime
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000
ENV STORAGE_DIR=/app/storage

# Install dumb-init or standard Alpine packages for signal handling
RUN apk add --no-cache curl

# Create non-root system user and storage directory
RUN addgroup -S trustvault && adduser -S trustvault -G trustvault
RUN mkdir -p /app/storage && chown -R trustvault:trustvault /app

USER trustvault

# Copy package manifests and production dependencies
COPY --chown=trustvault:trustvault package.json ./
COPY --chown=trustvault:trustvault server/package.json server/
COPY --chown=trustvault:trustvault client/package.json client/

COPY --from=builder --chown=trustvault:trustvault /app/node_modules ./node_modules
COPY --from=builder --chown=trustvault:trustvault /app/server/dist ./server/dist
COPY --from=builder --chown=trustvault:trustvault /app/server/prisma ./server/prisma
COPY --from=builder --chown=trustvault:trustvault /app/client/dist ./client/dist

# Expose internal API/web port
EXPOSE 5000

# Health check probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

WORKDIR /app/server
CMD ["node", "dist/index.js"]
