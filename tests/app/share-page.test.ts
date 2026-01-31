import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import type { ReactElement } from "react";
import { pastes, shares } from "../../src/db/schema";
import { createCryptoConfig, hashToken } from "../../src/lib/crypto";

let sharePage:
  | ((props: { params: { token: string } }) => ReactElement)
  | null = null;
let cleanup: (() => void) | null = null;

const shareToken = "a".repeat(64);
const tokenSecret = "share-secret-1234";

const setupSharePage = async () => {
  if (sharePage) {
    return;
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "paste-share-page-"));
  const dbPath = path.join(tempDir, "paste.db");

  const envSnapshot = {
    DATABASE_URL: process.env.DATABASE_URL,
    PASTE_ENCRYPTION_KEY: process.env.PASTE_ENCRYPTION_KEY,
    PASTE_TOKEN_HASH_SECRET: process.env.PASTE_TOKEN_HASH_SECRET,
  };

  process.env.DATABASE_URL = `file:${dbPath}`;
  process.env.PASTE_ENCRYPTION_KEY = "x".repeat(32);
  process.env.PASTE_TOKEN_HASH_SECRET = tokenSecret;

  const sqlite = new Database(dbPath);
  const db = drizzle(sqlite, { schema: { pastes, shares } });
  migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });

  const config = createCryptoConfig({
    encryptionKey: Buffer.alloc(32, 1),
    tokenHashSecret: Buffer.from(tokenSecret, "utf8"),
  });
  const digest = hashToken(shareToken, config);

  db.insert(pastes)
    .values({
      id: "paste-share-page",
      ownerType: "admin",
      contentType: "plain",
      contentCiphertext: Buffer.from("ciphertext"),
      contentIv: Buffer.from("iv-iv-iv-iv"),
      contentTag: Buffer.from("tag-tag-tag-tag"),
      contentSize: 9,
    })
    .run();

  db.insert(shares)
    .values({
      id: "share-share-page",
      pasteId: "paste-share-page",
      tokenHash: digest,
      oneTime: false,
      createdAt: Date.now() - 1000,
    })
    .run();

  sqlite.close();

  const pageModule = await import("../../src/app/share/[token]/page");
  sharePage = pageModule.default;

  cleanup = () => {
    if (envSnapshot.DATABASE_URL === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = envSnapshot.DATABASE_URL;
    }
    if (envSnapshot.PASTE_ENCRYPTION_KEY === undefined) {
      delete process.env.PASTE_ENCRYPTION_KEY;
    } else {
      process.env.PASTE_ENCRYPTION_KEY = envSnapshot.PASTE_ENCRYPTION_KEY;
    }
    if (envSnapshot.PASTE_TOKEN_HASH_SECRET === undefined) {
      delete process.env.PASTE_TOKEN_HASH_SECRET;
    } else {
      process.env.PASTE_TOKEN_HASH_SECRET = envSnapshot.PASTE_TOKEN_HASH_SECRET;
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  };
};

after(() => {
  cleanup?.();
});

test("invalid share token triggers 404", async () => {
  await setupSharePage();
  assert.throws(
    () => sharePage?.({ params: { token: "invalid" } }),
    (err: unknown) =>
      typeof err === "object" && err !== null
        ? (() => {
            const digest = (err as { digest?: string }).digest;
            const message =
              "message" in err ? String((err as { message?: string }).message) : "";
            return (
              digest === "NEXT_NOT_FOUND" ||
              digest === "NEXT_HTTP_ERROR_FALLBACK;404" ||
              message.includes("NEXT_HTTP_ERROR_FALLBACK;404")
            );
          })()
        : false
  );
});

test("valid share token renders", async () => {
  await setupSharePage();
  const result = sharePage?.({ params: { token: shareToken } });
  assert.ok(result);
});
