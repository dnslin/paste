# syntax=docker/dockerfile:1
FROM node:24-alpine AS base
WORKDIR /app
RUN npm install --global pnpm@11.19.0
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
RUN apk add --no-cache python3 make g++
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=paste-pnpm,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile

FROM deps AS builder
COPY . .
RUN pnpm build

# The migration script needs runtime ORM files beyond Next's traced routes.
# Install them from the same lockfile, never resolve dependencies in the runner.
FROM base AS prod-deps
RUN apk add --no-cache python3 make g++
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=paste-pnpm,target=/root/.local/share/pnpm/store pnpm install --prod --frozen-lockfile

FROM node:24-alpine AS runner
RUN apk add --no-cache dumb-init openssl su-exec && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY scripts/migrate.mjs ./scripts/migrate.mjs
COPY drizzle ./drizzle
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh && mkdir -p data && chown -R nextjs:nodejs data
EXPOSE 3000
ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["dumb-init", "--", "node", "server.js"]
