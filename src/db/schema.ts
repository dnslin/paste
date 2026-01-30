import { sql } from "drizzle-orm";
import {
  blob,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const nowMs = sql`(unixepoch() * 1000)`;

export const pastes = sqliteTable(
  "pastes",
  {
    id: text("id").primaryKey(),
    ownerType: text("owner_type").notNull(),
    ownerKeyHash: text("owner_key_hash"),
    title: text("title"),
    contentType: text("content_type").notNull(),
    contentCiphertext: blob("content_ciphertext", { mode: "buffer" }).notNull(),
    contentIv: blob("content_iv", { mode: "buffer" }).notNull(),
    contentTag: blob("content_tag", { mode: "buffer" }).notNull(),
    contentSize: integer("content_size").notNull(),
    language: text("language"),
    tagsJson: text("tags_json"),
    isPinned: integer("is_pinned", { mode: "boolean" })
      .notNull()
      .default(false),
    createdAt: integer("created_at").notNull().default(nowMs),
    updatedAt: integer("updated_at").notNull().default(nowMs),
    expiresAt: integer("expires_at"),
    deletedAt: integer("deleted_at"),
  },
  (table) => ({
    ownerTypeIdx: index("pastes_owner_type_idx").on(table.ownerType),
    ownerKeyHashIdx: index("pastes_owner_key_hash_idx").on(table.ownerKeyHash),
    createdAtIdx: index("pastes_created_at_idx").on(table.createdAt),
    expiresAtIdx: index("pastes_expires_at_idx").on(table.expiresAt),
    pinnedIdx: index("pastes_is_pinned_idx").on(table.isPinned),
  })
);

export const attachments = sqliteTable(
  "attachments",
  {
    id: text("id").primaryKey(),
    pasteId: text("paste_id")
      .notNull()
      .references(() => pastes.id, { onDelete: "cascade", onUpdate: "cascade" }),
    filename: text("filename").notNull(),
    mimeType: text("mime_type").notNull(),
    size: integer("size").notNull(),
    storagePath: text("storage_path").notNull(),
    sha256: text("sha256"),
    createdAt: integer("created_at").notNull().default(nowMs),
    deletedAt: integer("deleted_at"),
  },
  (table) => ({
    pasteIdIdx: index("attachments_paste_id_idx").on(table.pasteId),
    createdAtIdx: index("attachments_created_at_idx").on(table.createdAt),
  })
);

export const shares = sqliteTable(
  "shares",
  {
    id: text("id").primaryKey(),
    pasteId: text("paste_id")
      .notNull()
      .references(() => pastes.id, { onDelete: "cascade", onUpdate: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    passwordHash: text("password_hash"),
    oneTime: integer("one_time", { mode: "boolean" })
      .notNull()
      .default(false),
    expiresAt: integer("expires_at"),
    createdAt: integer("created_at").notNull().default(nowMs),
    lastAccessAt: integer("last_access_at"),
    revokedAt: integer("revoked_at"),
  },
  (table) => ({
    tokenHashUniq: uniqueIndex("shares_token_hash_uniq").on(table.tokenHash),
    pasteIdIdx: index("shares_paste_id_idx").on(table.pasteId),
    expiresAtIdx: index("shares_expires_at_idx").on(table.expiresAt),
    oneTimeIdx: index("shares_one_time_idx").on(table.oneTime),
    revokedAtIdx: index("shares_revoked_at_idx").on(table.revokedAt),
  })
);

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  valueJson: text("value_json").notNull(),
  updatedAt: integer("updated_at").notNull().default(nowMs),
});

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    subject: text("subject").notNull(),
    createdAt: integer("created_at").notNull().default(nowMs),
    expiresAt: integer("expires_at").notNull(),
    lastSeenAt: integer("last_seen_at"),
    ip: text("ip"),
    userAgent: text("user_agent"),
  },
  (table) => ({
    expiresAtIdx: index("sessions_expires_at_idx").on(table.expiresAt),
  })
);

export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    eventType: text("event_type").notNull(),
    actorType: text("actor_type").notNull(),
    actorId: text("actor_id"),
    ip: text("ip"),
    userAgent: text("user_agent"),
    targetType: text("target_type"),
    targetId: text("target_id"),
    metadataJson: text("metadata_json"),
    createdAt: integer("created_at").notNull().default(nowMs),
  },
  (table) => ({
    createdAtIdx: index("audit_logs_created_at_idx").on(table.createdAt),
    eventTypeIdx: index("audit_logs_event_type_idx").on(table.eventType),
    targetTypeIdx: index("audit_logs_target_type_idx").on(table.targetType),
  })
);
