# syntax=docker/dockerfile:1

# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:22-alpine AS deps

RUN apk add --no-cache python3 make g++ && \
    corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ============================================
# Stage 2: Builder
# ============================================
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# Generate database migrations and build
RUN mkdir -p data && \
    pnpm build

# ============================================
# Stage 3: Runner
# ============================================
FROM node:22-alpine AS runner

RUN apk add --no-cache dumb-init openssl su-exec && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy entrypoint and migration scripts
COPY --chown=nextjs:nodejs docker-entrypoint.sh /app/
COPY --chown=nextjs:nodejs scripts/migrate.js /app/scripts/
RUN chmod +x /app/docker-entrypoint.sh

# Install bcryptjs and better-sqlite3 with all dependencies
RUN apk add --no-cache --virtual .build-deps python3 make g++ && \
    mkdir -p /tmp/deps && cd /tmp/deps && \
    npm init -y && \
    npm install bcryptjs better-sqlite3 && \
    mkdir -p /app/node_modules && \
    cp -r node_modules/* /app/node_modules/ && \
    cd /app && rm -rf /tmp/deps && \
    apk del .build-deps

# Create data directory for SQLite (writable by nextjs user)
RUN mkdir -p data && chown -R nextjs:nodejs data

EXPOSE 3000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["dumb-init", "--", "node", "server.js"]
