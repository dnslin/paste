# syntax=docker/dockerfile:1

# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:22-alpine AS deps

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json ./
RUN npm install

# ============================================
# Stage 2: Builder
# ============================================
FROM node:22-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN mkdir -p data && npm run build

# ============================================
# Stage 3: Runner
# ============================================
FROM node:22-alpine AS runner

RUN apk add --no-cache dumb-init openssl su-exec python3 make g++ && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

COPY --chown=nextjs:nodejs docker-entrypoint.sh /app/
COPY --chown=nextjs:nodejs scripts/migrate.js /app/scripts/
RUN chmod +x /app/docker-entrypoint.sh

RUN cd /app && npm install better-sqlite3 bcryptjs && \
    apk del python3 make g++

RUN mkdir -p data && chown -R nextjs:nodejs data

EXPOSE 3000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["dumb-init", "--", "node", "server.js"]
