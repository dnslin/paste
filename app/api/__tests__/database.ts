import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { pastes, passwordAttempts, fileShares } from '@/lib/db/schema';

export const db = drizzle(new Database(':memory:'), { schema: { pastes, passwordAttempts, fileShares } });
migrate(db, { migrationsFolder: 'drizzle' });
