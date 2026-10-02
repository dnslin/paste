import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { pastes, passwordAttempts } from './schema';
import path from 'path';
import fs from 'fs';

const schema = { pastes, passwordAttempts };

const globalForDb = globalThis as unknown as {
  db: ReturnType<typeof createDb> | undefined;
};

function createDb() {
  const dbPath = path.join(process.cwd(), 'data', 'paste.db');
  const dbDir = path.dirname(dbPath);
  
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('busy_timeout = 5000');
  return drizzle(sqlite, { schema });
}

export const db = globalForDb.db ?? createDb();

if (process.env.NODE_ENV !== 'production') {
  globalForDb.db = db;
}
