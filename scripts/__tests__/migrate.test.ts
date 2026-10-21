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
    expect(sqlite.prepare('SELECT count(*) AS count FROM __drizzle_migrations').get()).toEqual({ count: 4 });
    sqlite.prepare("INSERT INTO pastes (id, content, created_at) VALUES ('existing', 'kept', 1)").run();
    sqlite.close();
    const journalPath = join(folder, 'meta/_journal.json');
    const journal = JSON.parse(readFileSync(journalPath, 'utf8'));
    journal.entries.push({ idx: 4, version: '6', when: Date.now() + 86400000, tag: '0004_test_column', breakpoints: true });
    writeFileSync(journalPath, JSON.stringify(journal));
    writeFileSync(join(folder, '0004_test_column.sql'), 'ALTER TABLE pastes ADD COLUMN test_column text;');
    migrateDatabase(databasePath, folder);
    migrateDatabase(databasePath, folder);
    const updated = new Database(databasePath);
    expect(updated.prepare('SELECT count(*) AS count FROM __drizzle_migrations').get()).toEqual({ count: 5 });
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
    sqlite.prepare("INSERT INTO password_attempts (id, paste_id, ip, attempts) VALUES ('existing:ip', 'existing', 'ip', 4)").run();
    sqlite.close();
    try {
      migrateDatabase(databasePath, 'drizzle');
      const updated = new Database(databasePath);
      expect(updated.prepare('SELECT content FROM pastes').get()).toEqual({ content: 'kept' });
      expect(updated.prepare('SELECT id, share_id, share_kind, attempts FROM password_attempts').get()).toEqual({ id: 'text:existing:ip', share_id: 'existing', share_kind: 'text', attempts: 4 });
      expect(updated.prepare('SELECT count(*) AS count FROM __drizzle_migrations').get()).toEqual({ count: 4 });
      updated.close();
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});

it('upgrades text and file shares without granting management rights to existing records', () => {
  const root = mkdtempSync(join(tmpdir(), 'paste-management-migrate-'));
  const databasePath = join(root, 'paste.db');
  const folder = join(root, 'drizzle');
  cpSync('drizzle', folder, { recursive: true });
  const journalPath = join(folder, 'meta/_journal.json');
  const journal = JSON.parse(readFileSync(journalPath, 'utf8'));
  writeFileSync(journalPath, JSON.stringify({ ...journal, entries: journal.entries.slice(0, 3) }));
  try {
    migrateDatabase(databasePath, folder);
    const previous = new Database(databasePath);
    previous.prepare("INSERT INTO pastes (id, content, created_at) VALUES ('text-before', 'kept content', 1)").run();
    previous.prepare("INSERT INTO file_shares (id, storage_key, file_name, size, expires_at, created_at) VALUES ('file-before', 'stored.bin', 'kept.txt', 4, 100, 1)").run();
    previous.close();
    writeFileSync(journalPath, JSON.stringify(journal));
    migrateDatabase(databasePath, folder);
    migrateDatabase(databasePath, folder);
    const updated = new Database(databasePath);
    expect(updated.prepare('SELECT content, management_token_hash FROM pastes').get()).toEqual({ content: 'kept content', management_token_hash: null });
    expect(updated.prepare('SELECT file_name, storage_key, management_token_hash FROM file_shares').get()).toEqual({ file_name: 'kept.txt', storage_key: 'stored.bin', management_token_hash: null });
    updated.close();
  } finally { rmSync(root, { recursive: true, force: true }); }
});
