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
import { createCryptoConfig, hashToken } from "../../src/lib/crypto";
import { resolveShareAccess } from "../../src/lib/share-access";

type DbInstance = BetterSQLite3Database<typeof schema> & {
  $client: Database.Database;
};

type DbFixture = {
  sqlite: Database.Database;
  db: DbInstance;
  tempDir: string;
};

const createFixture = (): DbFixture => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "paste-share-"));
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

const createConfig = () =>
  createCryptoConfig({
    encryptionKey: Buffer.alloc(32, 1),
    tokenHashSecret: Buffer.from("share-secret-1234", "utf8"),
  });

const insertPaste = (db: DbInstance, id: string) => {
  db.insert(schema.pastes)
    .values({
      id,
      ownerType: "admin",
      contentType: "plain",
      contentCiphertext: Buffer.from("ciphertext"),
      contentIv: Buffer.from("iv-iv-iv-iv"),
      contentTag: Buffer.from("tag-tag-tag-tag"),
      contentSize: 9,
    })
    .run();
};

test("valid share updates lastAccessAt", () => {
  const fixture = createFixture();
  const now = Date.now();
  const config = createConfig();
  const token = "a".repeat(64);
  const digest = hashToken(token, config);

  try {
    insertPaste(fixture.db, "paste-1");
    fixture.db
      .insert(schema.shares)
      .values({
        id: "share-1",
        pasteId: "paste-1",
        tokenHash: digest,
        oneTime: false,
        createdAt: now - 1000,
        expiresAt: now + 10000,
      })
      .run();

    const access = resolveShareAccess(token, {
      db: fixture.db,
      cryptoConfig: config,
      now,
    });

    assert.ok(access);
    assert.equal(access?.id, "share-1");

    const record = fixture.db
      .select()
      .from(schema.shares)
      .where(eq(schema.shares.id, "share-1"))
      .get();

    assert.equal(record?.lastAccessAt, now);
    assert.equal(record?.revokedAt, null);
  } finally {
    cleanupFixture(fixture);
  }
});

test("expired share returns null", () => {
  const fixture = createFixture();
  const now = Date.now();
  const config = createConfig();
  const token = "b".repeat(64);
  const digest = hashToken(token, config);

  try {
    insertPaste(fixture.db, "paste-2");
    fixture.db
      .insert(schema.shares)
      .values({
        id: "share-2",
        pasteId: "paste-2",
        tokenHash: digest,
        oneTime: false,
        createdAt: now - 10000,
        expiresAt: now - 1,
      })
      .run();

    const access = resolveShareAccess(token, {
      db: fixture.db,
      cryptoConfig: config,
      now,
    });

    assert.equal(access, null);
  } finally {
    cleanupFixture(fixture);
  }
});

test("revoked share returns null", () => {
  const fixture = createFixture();
  const now = Date.now();
  const config = createConfig();
  const token = "c".repeat(64);
  const digest = hashToken(token, config);

  try {
    insertPaste(fixture.db, "paste-3");
    fixture.db
      .insert(schema.shares)
      .values({
        id: "share-3",
        pasteId: "paste-3",
        tokenHash: digest,
        oneTime: false,
        createdAt: now - 10000,
        revokedAt: now - 5000,
      })
      .run();

    const access = resolveShareAccess(token, {
      db: fixture.db,
      cryptoConfig: config,
      now,
    });

    assert.equal(access, null);
  } finally {
    cleanupFixture(fixture);
  }
});

test("one-time share revokes after first access", () => {
  const fixture = createFixture();
  const now = Date.now();
  const config = createConfig();
  const token = "d".repeat(64);
  const digest = hashToken(token, config);

  try {
    insertPaste(fixture.db, "paste-4");
    fixture.db
      .insert(schema.shares)
      .values({
        id: "share-4",
        pasteId: "paste-4",
        tokenHash: digest.split(":")[1],
        oneTime: true,
        createdAt: now - 10000,
      })
      .run();

    const first = resolveShareAccess(token, {
      db: fixture.db,
      cryptoConfig: config,
      now,
    });

    assert.ok(first);

    const record = fixture.db
      .select()
      .from(schema.shares)
      .where(eq(schema.shares.id, "share-4"))
      .get();

    assert.equal(record?.revokedAt, now);
    assert.equal(record?.lastAccessAt, now);

    const second = resolveShareAccess(token, {
      db: fixture.db,
      cryptoConfig: config,
      now: now + 1000,
    });

    assert.equal(second, null);
  } finally {
    cleanupFixture(fixture);
  }
});
