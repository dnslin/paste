import { sqliteTable, text, integer, index, check } from 'drizzle-orm/sqlite-core';
import { sql, type InferSelectModel, type InferInsertModel } from 'drizzle-orm';

export const pastes = sqliteTable('pastes', {
  id: text('id').primaryKey(),
  kind: text('kind', { enum: ['text', 'file'] }).notNull().default('text'),
  content: text('content').notNull(),
  language: text('language').default('plaintext'),
  passwordHash: text('password_hash'),
  expiresAt: integer('expires_at', { mode: 'timestamp' }),
  burnCount: integer('burn_count'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  iv: text('iv'),
  encrypted: integer('encrypted', { mode: 'boolean' }).default(false),
}, (table) => [check('pastes_kind_check', sql`${table.kind} IN ('text', 'file')`)]);

export type Paste = InferSelectModel<typeof pastes>;
export type NewPaste = InferInsertModel<typeof pastes>;

export const passwordAttempts = sqliteTable('password_attempts', {
  id: text('id').primaryKey(),
  pasteId: text('paste_id').notNull(),
  ip: text('ip').notNull(),
  attempts: integer('attempts').notNull().default(0),
  lockedUntil: integer('locked_until', { mode: 'timestamp' }),
});

export type PasswordAttempt = InferSelectModel<typeof passwordAttempts>;
export type NewPasswordAttempt = InferInsertModel<typeof passwordAttempts>;

// File bytes live only in the private volume. Text keeps its original NOT NULL content.
export const files = sqliteTable('files', {
  pasteId: text('paste_id').primaryKey().references(() => pastes.id, { onDelete: 'cascade' }),
  storageKey: text('storage_key').notNull().unique(),
  fileName: text('file_name').notNull(),
  size: integer('size').notNull(),
  encryptionVersion: integer('encryption_version').notNull(),
  nonce: text('nonce').notNull(),
  tag: text('tag').notNull(),
  state: text('state', { enum: ['ready', 'deleting'] }).notNull().default('ready'),
}, (table) => [
  check('files_state_check', sql`${table.state} IN ('ready', 'deleting')`),
  check('files_size_check', sql`${table.size} >= 0 AND ${table.size} <= 10485760`),
]);

export const downloadGrants = sqliteTable('download_grants', {
  tokenHash: text('token_hash').primaryKey(),
  pasteId: text('paste_id').notNull().references(() => pastes.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
}, (table) => [index('download_grants_paste_expiry_idx').on(table.pasteId, table.expiresAt)]);

export type StoredFile = InferSelectModel<typeof files>;
export type DownloadGrant = InferSelectModel<typeof downloadGrants>;
