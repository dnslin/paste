import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { eq } from "drizzle-orm";
import * as schema from "../../src/db/schema";
import { listAuditLogs, writeAuditLog } from "../../src/lib/audit-log";

type DbInstance = BetterSQLite3Database<typeof schema> & {
  $client: Database.Database;
};

type DbFixture = {
  sqlite: Database.Database;
  db: DbInstance;
  tempDir: string;
};

const createFixture = (): DbFixture => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "paste-audit-"));
  const dbPath = path.join(tempDir, "paste.db");
  const sqlite = new Database(dbPath);
  const db = drizzle(sqlite, { schema }) as DbInstance;
  migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return { sqlite, db, tempDir };
};

const cleanupFixture = ({ sqlite, tempDir }: DbFixture) => {
  sqlite.close();
  fs.rmSync(tempDir, { recursive: true, force: true });
};

test("writeAuditLog inserts a record", () => {
  const fixture = createFixture();
  const now = Date.now();

  try {
    const record = writeAuditLog(
      {
        eventType: "auth.login_failed",
        actorType: "admin",
        actorId: "admin-1",
        ip: "127.0.0.1",
        metadata: { reason: "bad_password" },
        createdAt: now,
      },
      { db: fixture.db, now, id: () => "log-1" }
    );

    assert.equal(record.id, "log-1");

    const row = fixture.db
      .select()
      .from(schema.auditLogs)
      .where(eq(schema.auditLogs.id, "log-1"))
      .get();

    assert.ok(row);
    assert.equal(row?.eventType, "auth.login_failed");
    assert.equal(row?.metadataJson, JSON.stringify({ reason: "bad_password" }));
  } finally {
    cleanupFixture(fixture);
  }
});

test("listAuditLogs filters and orders records", () => {
  const fixture = createFixture();
  const now = Date.now();

  try {
    writeAuditLog(
      {
        eventType: "share.access",
        actorType: "guest",
        targetType: "share",
        targetId: "share-1",
        metadata: { outcome: "ok" },
        createdAt: now - 1000,
      },
      { db: fixture.db, now, id: () => "log-1" }
    );

    writeAuditLog(
      {
        eventType: "guest.create",
        actorType: "guest",
        ip: "10.0.0.1",
        createdAt: now,
      },
      { db: fixture.db, now, id: () => "log-2" }
    );

    const filtered = listAuditLogs(
      { eventType: "share.access", targetType: "share", targetId: "share-1" },
      { db: fixture.db }
    );
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]?.id, "log-1");
    assert.equal(filtered[0]?.metadata?.outcome, "ok");

    const all = listAuditLogs({}, { db: fixture.db });
    assert.equal(all.length, 2);
    assert.equal(all[0]?.id, "log-2");
    assert.equal(all[1]?.id, "log-1");
  } finally {
    cleanupFixture(fixture);
  }
});
