import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

test("migrations run on empty database and are repeatable", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "paste-db-"));
  const dbPath = path.join(tempDir, "paste.db");

  const sqlite = new Database(dbPath);
  const db = drizzle(sqlite);

  migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });

  const rows = sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all() as Array<{ name: string }>;
  const tables = rows.map((row) => row.name);

  const expected = [
    "pastes",
    "attachments",
    "shares",
    "settings",
    "sessions",
    "audit_logs",
  ];

  for (const name of expected) {
    assert.ok(tables.includes(name), `missing table ${name}`);
  }

  sqlite.close();
  fs.rmSync(tempDir, { recursive: true, force: true });
});
