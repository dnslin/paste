import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';

export const pastes = sqliteTable('pastes', {
  id: text('id').primaryKey(),
  content: text('content').notNull(),
  language: text('language').default('plaintext'),
  passwordHash: text('password_hash'),
  expiresAt: integer('expires_at', { mode: 'timestamp' }),
  burnCount: integer('burn_count'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  iv: text('iv'),
  encrypted: integer('encrypted', { mode: 'boolean' }).default(false),
});

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
