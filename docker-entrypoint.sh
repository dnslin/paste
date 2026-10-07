#!/bin/sh
set -e

SECRETS_FILE="/app/data/.secrets"

mkdir -p /app/data
chown -R nextjs:nodejs /app/data

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

chown nextjs:nodejs "$SECRETS_FILE"

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
        const password = process.env.ADMIN_PASSWORD;
        if (!password.trim() || bcrypt.truncates(password)) {
            throw new Error('ADMIN_PASSWORD must be non-blank and at most 72 UTF-8 bytes');
        }
        console.log(bcrypt.hashSync(password, 10));
    ")
    
    if [ -z "$ADMIN_PASSWORD_HASH" ]; then
        echo "[entrypoint] ERROR: Failed to generate password hash"
        exit 1
    fi
fi

export ADMIN_PASSWORD_HASH

# ============================================
# 3. Apply generated migrations
# ============================================
echo "[entrypoint] Applying database migrations..."
su-exec nextjs:nodejs node /app/scripts/migrate.mjs

# ============================================
# 4. Start the application
# ============================================
echo "[entrypoint] Starting application..."
exec su-exec nextjs:nodejs "$@"
