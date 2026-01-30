import test from "node:test";
import assert from "node:assert/strict";
import { getTableConfig } from "drizzle-orm/sqlite-core";

const loadSchema = async () => {
  const schemaModule = await import("../../src/db/schema.ts");
  return (schemaModule.default ?? schemaModule) as any;
};

const getColumn = (table: any, name: string) => {
  const config = getTableConfig(table);
  return config.columns.find((col: any) => col.name === name);
};

test("pastes schema constraints", async () => {
  const { pastes } = await loadSchema();
  const id = getColumn(pastes, "id");
  const ownerType = getColumn(pastes, "owner_type");
  const cipher = getColumn(pastes, "content_ciphertext");
  const createdAt = getColumn(pastes, "created_at");
  const isPinned = getColumn(pastes, "is_pinned");
  const expiresAt = getColumn(pastes, "expires_at");

  assert.equal(id?.notNull, true);
  assert.equal(ownerType?.notNull, true);
  assert.equal(cipher?.notNull, true);
  assert.equal(createdAt?.hasDefault, true);
  assert.equal(isPinned?.hasDefault, true);
  assert.equal(expiresAt?.notNull, false);
});

test("shares has unique token_hash index", async () => {
  const { shares } = await loadSchema();
  const config = getTableConfig(shares);
  const tokenIndex = config.indexes.find((idx: any) => idx.config?.name === "shares_token_hash_uniq");
  assert.ok(tokenIndex, "shares_token_hash_uniq index should exist");
  assert.equal(tokenIndex?.config?.unique, true);
});

test("sessions has expires_at index", async () => {
  const { sessions } = await loadSchema();
  const config = getTableConfig(sessions);
  const indexNames = config.indexes.map((idx: any) => idx.config?.name);
  assert.ok(indexNames.includes("sessions_expires_at_idx"));
});

test("settings value_json is required", async () => {
  const { settings } = await loadSchema();
  const valueJson = getColumn(settings, "value_json");
  assert.equal(valueJson?.notNull, true);
});
