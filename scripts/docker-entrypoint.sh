#!/bin/sh
# Docker entrypoint script - runs database migration before starting the server

set -e

echo "🚀 Starting Paste service..."

# Run database migration if migration files exist
if [ -d "/app/drizzle" ] && [ "$(ls -A /app/drizzle/*.sql 2>/dev/null)" ]; then
  echo "🔄 Running database migrations..."
  if node /app/scripts/migrate.js; then
    echo "✅ Database migration completed successfully"
  else
    echo "❌ Database migration failed"
    exit 1
  fi
else
  echo "ℹ️  No migration files found, skipping migration"
fi

echo "✅ Starting Next.js server..."

# Start the Next.js server
exec "$@"
