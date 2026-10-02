import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function migrateDatabase(databasePath, migrationsFolder) {
  mkdirSync(dirname(databasePath), { recursive: true });
  const sqlite = new Database(databasePath);
  try {
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('busy_timeout = 5000');
    migrate(drizzle(sqlite), { migrationsFolder });
  } finally {
    sqlite.close();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  migrateDatabase(resolve('data/paste.db'), fileURLToPath(new URL('../drizzle/', import.meta.url)));
  console.log('[migrate] Drizzle migrations applied');
}
