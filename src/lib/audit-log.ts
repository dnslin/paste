import { randomUUID } from "node:crypto";
import { and, desc, eq, gte, lte, type SQL } from "drizzle-orm";
import { db as defaultDb } from "../db/client";
import { auditLogs } from "../db/schema";

export type AuditLogInput = {
  eventType: string;
  actorType: string;
  actorId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: number;
};

export type AuditLogFilters = {
  eventType?: string;
  actorType?: string;
  actorId?: string;
  ip?: string;
  targetType?: string;
  targetId?: string;
  from?: number;
  to?: number;
  limit?: number;
  offset?: number;
};

export type AuditLogRecord = {
  id: string;
  eventType: string;
  actorType: string;
  actorId: string | null;
  ip: string | null;
  userAgent: string | null;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  metadataRaw?: string | null;
  createdAt: number;
};

export type AuditLogDeps = {
  db?: typeof defaultDb;
  now?: number;
  id?: () => string;
};

const resolveDb = (deps: AuditLogDeps) => deps.db ?? defaultDb;

const serializeMetadata = (
  metadata?: Record<string, unknown> | null
): string | null => {
  if (!metadata) {
    return null;
  }
  return JSON.stringify(metadata);
};

const parseMetadata = (value: string | null) => {
  if (!value) {
    return { metadata: null, metadataRaw: null };
  }
  try {
    return {
      metadata: JSON.parse(value) as Record<string, unknown>,
      metadataRaw: null,
    };
  } catch {
    return { metadata: null, metadataRaw: value };
  }
};

export const writeAuditLog = (
  input: AuditLogInput,
  deps: AuditLogDeps = {}
): AuditLogRecord => {
  const db = resolveDb(deps);
  const now = deps.now ?? Date.now();
  const id = (deps.id ?? randomUUID)();
  const createdAt = input.createdAt ?? now;
  const metadataJson = serializeMetadata(input.metadata);

  db.insert(auditLogs)
    .values({
      id,
      eventType: input.eventType,
      actorType: input.actorType,
      actorId: input.actorId ?? null,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      metadataJson,
      createdAt,
    })
    .run();

  return {
    id,
    eventType: input.eventType,
    actorType: input.actorType,
    actorId: input.actorId ?? null,
    ip: input.ip ?? null,
    userAgent: input.userAgent ?? null,
    targetType: input.targetType ?? null,
    targetId: input.targetId ?? null,
    metadata: input.metadata ?? null,
    createdAt,
  };
};

export const listAuditLogs = (
  filters: AuditLogFilters = {},
  deps: AuditLogDeps = {}
): AuditLogRecord[] => {
  const db = resolveDb(deps);
  const conditions: SQL<unknown>[] = [];

  if (filters.eventType) {
    conditions.push(eq(auditLogs.eventType, filters.eventType));
  }
  if (filters.actorType) {
    conditions.push(eq(auditLogs.actorType, filters.actorType));
  }
  if (filters.actorId) {
    conditions.push(eq(auditLogs.actorId, filters.actorId));
  }
  if (filters.ip) {
    conditions.push(eq(auditLogs.ip, filters.ip));
  }
  if (filters.targetType) {
    conditions.push(eq(auditLogs.targetType, filters.targetType));
  }
  if (filters.targetId) {
    conditions.push(eq(auditLogs.targetId, filters.targetId));
  }
  if (filters.from !== undefined) {
    conditions.push(gte(auditLogs.createdAt, filters.from));
  }
  if (filters.to !== undefined) {
    conditions.push(lte(auditLogs.createdAt, filters.to));
  }

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;

  const query = db
    .select()
    .from(auditLogs)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset);

  const rows = query.all();

  return rows.map((row) => {
    const parsed = parseMetadata(row.metadataJson);
    return {
      id: row.id,
      eventType: row.eventType,
      actorType: row.actorType,
      actorId: row.actorId ?? null,
      ip: row.ip ?? null,
      userAgent: row.userAgent ?? null,
      targetType: row.targetType ?? null,
      targetId: row.targetId ?? null,
      metadata: parsed.metadata,
      metadataRaw: parsed.metadataRaw,
      createdAt: row.createdAt,
    };
  });
};
