#!/bin/sh
set -e

SECRETS_FILE="/app/data/.secrets"
DB_FILE="/app/data/paste.db"

chown -R nextjs:nodejs /app/data 2>/dev/null || true

# ============================================
# 1. Generate or load secrets
# ============================================
if [ -f "$SECRETS_FILE" ]; then
    echo "[entrypoint] Loading existing secrets from $SECRETS_FILE"
    . "$SECRETS_FILE"
else
    echo "[entrypoint] First run - generating secrets..."
    
    # Generate ENCRYPTION_KEY (64 hex chars = 32 bytes)
    ENCRYPTION_KEY=$(openssl rand -hex 32)
    
    # Generate SESSION_SECRET (32 bytes base64)
    SESSION_SECRET=$(openssl rand -base64 32)
    
    # Save to secrets file
    cat > "$SECRETS_FILE" << EOF
ENCRYPTION_KEY=$ENCRYPTION_KEY
SESSION_SECRET=$SESSION_SECRET
EOF
    chmod 600 "$SECRETS_FILE"
    echo "[entrypoint] Secrets saved to $SECRETS_FILE"
fi

export ENCRYPTION_KEY
export SESSION_SECRET

# ============================================
# 2. Handle admin password
# ============================================
if [ -z "$ADMIN_PASSWORD_HASH" ]; then
    if [ -z "$ADMIN_PASSWORD" ]; then
        echo "[entrypoint] ERROR: ADMIN_PASSWORD is required"
        echo "[entrypoint] Set ADMIN_PASSWORD environment variable in docker-compose.yaml"
        exit 1
    fi
    
    echo "[entrypoint] Generating bcrypt hash from ADMIN_PASSWORD..."
    ADMIN_PASSWORD_HASH=$(node -e "
        const bcrypt = require('bcryptjs');
        console.log(bcrypt.hashSync(process.env.ADMIN_PASSWORD, 10));
    ")
    
    if [ -z "$ADMIN_PASSWORD_HASH" ]; then
        echo "[entrypoint] ERROR: Failed to generate password hash"
        exit 1
    fi
fi

export ADMIN_PASSWORD_HASH

# ============================================
# 3. Initialize database if needed
# ============================================
if [ ! -f "$DB_FILE" ]; then
    echo "[entrypoint] Initializing database..."
    node /app/scripts/migrate.js
    echo "[entrypoint] Database initialized"
else
    echo "[entrypoint] Database exists, checking migrations..."
    node /app/scripts/migrate.js
fi

# ============================================
# 4. Start the application
# ============================================
echo "[entrypoint] Starting application..."
exec su-exec nextjs "$@"
