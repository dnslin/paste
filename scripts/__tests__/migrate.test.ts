// @vitest-environment node
import { mkdtempSync, cpSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { migrateDatabase } from '../migrate.mjs';

it('initializes from generated migrations and applies a later migration exactly once', () => {
  const root = mkdtempSync(join(tmpdir(), 'paste-migrate-'));
  const databasePath = join(root, 'data/paste.db');
  const folder = join(root, 'drizzle');
  cpSync('drizzle', folder, { recursive: true });
  try {
    migrateDatabase(databasePath, folder);
    migrateDatabase(databasePath, folder);
    const sqlite = new Database(databasePath);
    expect(sqlite.prepare('SELECT count(*) AS count FROM __drizzle_migrations').get()).toEqual({ count: 3 });
    sqlite.prepare("INSERT INTO pastes (id, content, created_at) VALUES ('existing', 'kept', 1)").run();
    sqlite.close();
    const journalPath = join(folder, 'meta/_journal.json');
    const journal = JSON.parse(readFileSync(journalPath, 'utf8'));
    journal.entries.push({ idx: 3, version: '6', when: Date.now() + 100000000000, tag: '0003_test_column', breakpoints: true });
    writeFileSync(journalPath, JSON.stringify(journal));
    writeFileSync(join(folder, '0003_test_column.sql'), 'ALTER TABLE pastes ADD COLUMN test_column text;');
    migrateDatabase(databasePath, folder);
    migrateDatabase(databasePath, folder);
    const updated = new Database(databasePath);
    expect(updated.prepare('SELECT count(*) AS count FROM __drizzle_migrations').get()).toEqual({ count: 4 });
    expect(updated.prepare('SELECT id, content, test_column FROM pastes').get()).toEqual({ id: 'existing', content: 'kept', test_column: null });
    updated.close();
  } finally { rmSync(root, { recursive: true, force: true }); }
});

describe('existing initial schema', () => {
  it('records initial migrations without deleting existing tables or records', () => {
    const root = mkdtempSync(join(tmpdir(), 'paste-existing-'));
    const databasePath = join(root, 'paste.db');
    const sqlite = new Database(databasePath);
    sqlite.exec(readFileSync('drizzle/0000_yielding_micromacro.sql', 'utf8'));
    sqlite.exec(readFileSync('drizzle/0001_charming_phil_sheldon.sql', 'utf8'));
    sqlite.prepare("INSERT INTO pastes (id, content, created_at) VALUES ('existing', 'kept', 1)").run();
    sqlite.close();
    try {
      migrateDatabase(databasePath, 'drizzle');
      const updated = new Database(databasePath);
      expect(updated.prepare('SELECT content, kind FROM pastes').get()).toEqual({ content: 'kept', kind: 'text' });
      expect(() => updated.prepare("INSERT INTO pastes (id,content,created_at,kind) VALUES ('invalid','',1,'other')").run()).toThrow();
      expect(updated.pragma('foreign_key_check')).toEqual([]);
      expect(updated.prepare('SELECT count(*) AS count FROM __drizzle_migrations').get()).toEqual({ count: 3 });
      updated.close();
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});
