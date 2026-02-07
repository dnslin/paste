const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(process.cwd(), 'data', 'paste.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');

const tableExists = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='pastes'
`).get();

if (!tableExists) {
    console.log('[migrate] Creating pastes table...');
    db.exec(`
        CREATE TABLE pastes (
            id TEXT PRIMARY KEY NOT NULL,
            content TEXT NOT NULL,
            language TEXT DEFAULT 'plaintext',
            password_hash TEXT,
            expires_at INTEGER,
            burn_count INTEGER,
            created_at INTEGER NOT NULL,
            iv TEXT,
            encrypted INTEGER DEFAULT 0
        )
    `);
    console.log('[migrate] Table created successfully');
} else {
    console.log('[migrate] Database schema is up to date');
}

const attemptsTableExists = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='password_attempts'
`).get();

if (!attemptsTableExists) {
    console.log('[migrate] Creating password_attempts table...');
    db.exec(`
        CREATE TABLE password_attempts (
            id TEXT PRIMARY KEY NOT NULL,
            paste_id TEXT NOT NULL,
            ip TEXT NOT NULL,
            attempts INTEGER NOT NULL DEFAULT 0,
            locked_until INTEGER
        )
    `);
    console.log('[migrate] password_attempts table created');
}

db.close();
