# Scripts

This directory contains utility scripts for setting up and managing the Paste service.

## Available Scripts

### `setup.js`

Interactive setup wizard that generates the `.env` configuration file.

**Usage:**
```bash
pnpm setup
# or
node scripts/setup.js
```

**What it does:**
- Prompts user to choose: enter own password OR auto-generate random password
- For manual entry: prompts for admin password (minimum 8 characters) with confirmation
- For auto-generation: generates secure random password and displays it
- Generates `ENCRYPTION_KEY` (64-char hex, 32 bytes)
- Generates `SESSION_SECRET` (base64 encoded)
- Generates `ADMIN_PASSWORD_HASH` (bcrypt with cost=10) from chosen password
- Creates `.env` file with all required variables
- Shows configuration summary

**Features:**
- Two password setup modes: manual or auto-generated
- Password validation (min 8 chars, confirmation required for manual entry)
- Warns if `.env` already exists
- Bilingual output (English/Chinese)

### `migrate.js`

Database migration script that initializes the SQLite database.

**Usage:**
```bash
pnpm db:migrate
# or
node scripts/migrate.js
```

**What it does:**
- Creates `data/` directory if it doesn't exist
- Connects to SQLite database at `data/paste.db`
- Runs all migration files from `drizzle/` directory
- Initializes tables: `pastes`, `password_attempts`, `__drizzle_migrations`
- Enables WAL mode for better concurrency

**Features:**
- Idempotent (safe to run multiple times)
- Creates necessary directories automatically
- Detailed progress output

### `docker-entrypoint.sh`

Docker container entrypoint script that runs migrations before starting the server.

**Usage:**
This script is automatically called when the Docker container starts.

**What it does:**
- Checks if migration files exist in `/app/drizzle`
- Runs database migration if needed
- Starts the Next.js server
- Handles errors gracefully

**Features:**
- Automatic database initialization on container startup
- Safe error handling (continues even if migration fails)
- Clean logging output

## Development

All scripts are written as ES modules and use:
- Node.js built-in modules (`crypto`, `fs`, `path`)
- Project dependencies (`bcryptjs`, `better-sqlite3`, `drizzle-orm`)

## Troubleshooting

### Module Warning
If you see warnings about "MODULE_TYPELESS_PACKAGE_JSON", it's safe to ignore. The scripts work correctly.

### Permission Denied
If you get permission errors on Linux/macOS:
```bash
chmod +x scripts/*.sh
```

### Database Locked
If you get "database is locked" errors:
- Make sure no other process is using the database
- Check if `data/*.db-wal` and `data/*.db-shm` files exist
- Try restarting the application
