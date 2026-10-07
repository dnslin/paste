import bcrypt from 'bcryptjs';
import { createHash } from 'node:crypto';
import { and, eq, gt, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { downloadGrants, files, pastes, passwordAttempts, type PasswordAttempt } from '@/lib/db/schema';
import { ApiError, NOT_FOUND, RATE_LIMITED, UNAUTHORIZED, VALIDATION_ERROR } from '@/lib/api-response';
import { createRateLimiter } from '@/lib/rate-limit';
import { acquirePayloadSlot, deleteStoredFile, ensureFileStorage, readFilePayload, scanOrphanFiles } from '@/lib/file-storage';
import { CLEANUP_INTERVAL_MS, GRANT_TTL_MS } from '@/lib/file-config';

// Only one Node process may own a file volume. Transactions contain no async work or file I/O.
type Reader = Pick<typeof db, 'select'>;
const passwordLimiter = createRateLimiter({ maxTokens: 10, refillRate: 10, refillInterval: 60000 });
const claimLimiter = createRateLimiter({ maxTokens: 20, refillRate: 20, refillInterval: 60000 });

function requireFile(id: string, reader: Reader = db) {
  const row = reader.select({ paste: pastes, file: files }).from(pastes)
    .innerJoin(files, eq(pastes.id, files.pasteId)).where(eq(pastes.id, id)).get();
  if (!row || row.paste.kind !== 'file' || row.file.state !== 'ready' ||
    !row.paste.expiresAt || row.paste.expiresAt <= new Date()) {
    throw new ApiError(NOT_FOUND, '文件不存在、已过期或已撤销');
  }
  return row;
}

function requireUnlocked(attempt: PasswordAttempt | undefined) {
  if (attempt?.lockedUntil && attempt.lockedUntil > new Date()) {
    throw new ApiError(RATE_LIMITED, '密码错误次数过多，请在 15 分钟后重试');
  }
}

async function checkPassword(id: string, hash: string | null, password: string | undefined, ip: string) {
  if (!hash) return;
  if (!password) throw new ApiError(VALIDATION_ERROR, '请输入密码');
  const attemptId = `${id}:${ip}`;
  requireUnlocked(db.select().from(passwordAttempts).where(eq(passwordAttempts.id, attemptId)).get());
  if (!passwordLimiter.consume(ip).allowed) throw new ApiError(RATE_LIMITED, '验证请求过多，请稍后重试');
  if (!await bcrypt.compare(password, hash)) {
    const remaining = db.transaction(tx => {
      requireFile(id, tx);
      const current = tx.select().from(passwordAttempts).where(eq(passwordAttempts.id, attemptId)).get();
      requireUnlocked(current);
      const attempts = (current?.lockedUntil && current.lockedUntil <= new Date() ? 0 : current?.attempts ?? 0) + 1;
      const lockedUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60000) : null;
      tx.insert(passwordAttempts).values({ id: attemptId, pasteId: id, ip, attempts, lockedUntil })
        .onConflictDoUpdate({ target: passwordAttempts.id, set: { attempts, lockedUntil } }).run();
      return Math.max(0, 5 - attempts);
    }, { behavior: 'immediate' });
    throw new ApiError(VALIDATION_ERROR, `密码错误，还可尝试 ${remaining} 次`);
  }
}

export async function verifyFile(id: string, password: string | undefined, ip: string) {
  const initial = requireFile(id);
  await checkPassword(id, initial.paste.passwordHash, password, ip);
  return db.transaction(tx => {
    const { paste, file } = requireFile(id, tx);
    if (paste.passwordHash) {
      requireUnlocked(tx.select().from(passwordAttempts).where(eq(passwordAttempts.id, `${id}:${ip}`)).get());
      tx.delete(passwordAttempts).where(eq(passwordAttempts.id, `${id}:${ip}`)).run();
    }
    return { fileName: file.fileName, size: file.size, expiresAt: paste.expiresAt!.toISOString(), burnCount: paste.burnCount };
  }, { behavior: 'immediate' });
}

export function hashClaimKey(key: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(key) || Buffer.from(key, 'base64url').toString('base64url') !== key) {
    throw new ApiError(VALIDATION_ERROR, '下载凭证格式无效');
  }
  return createHash('sha256').update(key).digest('hex');
}

function existingGrant(id: string, tokenHash: string, reader: Reader = db) {
  const grant = reader.select().from(downloadGrants).where(eq(downloadGrants.tokenHash, tokenHash)).get();
  if (!grant) return null;
  if (grant.pasteId !== id) throw new ApiError(UNAUTHORIZED, '下载凭证无效');
  const { paste } = requireFile(id, reader);
  if (grant.expiresAt <= new Date()) throw new ApiError('GRANT_EXPIRED', '下载凭证已过期；重新领取将扣除一次');
  return { expiresAt: grant.expiresAt.toISOString(), remainingDownloads: paste.burnCount };
}

export async function claimFile(id: string, claimKey: string, password: string | undefined, ip: string, signal?: AbortSignal) {
  const tokenHash = hashClaimKey(claimKey);
  const prior = existingGrant(id, tokenHash);
  if (prior) return prior;
  const initial = requireFile(id);
  if (!initial.paste.burnCount || initial.paste.burnCount < 1) throw new ApiError('EXHAUSTED', '允许领取下载的次数已用完');
  if (!claimLimiter.consume(ip).allowed) throw new ApiError(RATE_LIMITED, '领取请求过多，请稍后重试');
  await checkPassword(id, initial.paste.passwordHash, password, ip);
  signal?.throwIfAborted();
  const release = acquirePayloadSlot();
  try {
    // Authentication completes before any grant can be charged; do not stream unverified plaintext.
    await readFilePayload(id, initial.file, signal);
    signal?.throwIfAborted();
    return db.transaction(tx => {
      const retry = existingGrant(id, tokenHash, tx);
      if (retry) return retry;
      const { paste } = requireFile(id, tx);
      if (paste.passwordHash) requireUnlocked(tx.select().from(passwordAttempts).where(eq(passwordAttempts.id, `${id}:${ip}`)).get());
      const claimed = tx.update(pastes).set({ burnCount: sql`${pastes.burnCount} - 1` })
        .where(and(eq(pastes.id, id), eq(pastes.kind, 'file'), gt(pastes.burnCount, 0)))
        .returning({ burnCount: pastes.burnCount }).get();
      if (!claimed) throw new ApiError('EXHAUSTED', '允许领取下载的次数已用完');
      const now = new Date();
      const expiresAt = new Date(Math.min(now.getTime() + GRANT_TTL_MS, paste.expiresAt!.getTime()));
      tx.insert(downloadGrants).values({ tokenHash, pasteId: id, createdAt: now, expiresAt }).run();
      if (paste.passwordHash) tx.delete(passwordAttempts).where(eq(passwordAttempts.id, `${id}:${ip}`)).run();
      return { expiresAt: expiresAt.toISOString(), remainingDownloads: claimed.burnCount };
    }, { behavior: 'immediate' });
  } finally { release(); }
}

export function authorizeDownload(id: string, claimKey: string) {
  const hash = hashClaimKey(claimKey);
  if (!existingGrant(id, hash)) throw new ApiError(UNAUTHORIZED, '下载凭证无效');
  return requireFile(id);
}

const lifecycle = globalThis as unknown as {
  pasteFileCleanup?: Promise<void>;
  pasteFileStartup?: Promise<void>;
  pasteFileTimer?: ReturnType<typeof setInterval>;
};

async function runCleanup(startup: boolean) {
  await ensureFileStorage();
  const candidates = db.select({ paste: pastes, file: files }).from(files)
    .innerJoin(pastes, eq(files.pasteId, pastes.id)).all();
  for (const candidate of candidates) {
    const marked = db.transaction(tx => {
      const row = tx.select({ paste: pastes, file: files }).from(files)
        .innerJoin(pastes, eq(files.pasteId, pastes.id)).where(eq(pastes.id, candidate.paste.id)).get();
      if (!row || row.paste.kind !== 'file') return false;
      const now = new Date();
      const expired = !row.paste.expiresAt || row.paste.expiresAt <= now;
      const liveGrant = tx.select({ tokenHash: downloadGrants.tokenHash }).from(downloadGrants)
        .where(and(eq(downloadGrants.pasteId, row.paste.id), gt(downloadGrants.expiresAt, now))).get();
      const exhausted = row.paste.burnCount !== null && row.paste.burnCount <= 0 && !liveGrant;
      if (row.file.state !== 'deleting' && !expired && !exhausted) return false;
      tx.update(files).set({ state: 'deleting' }).where(eq(files.pasteId, row.paste.id)).run();
      return true;
    }, { behavior: 'immediate' });
    if (!marked) continue;
    try {
      await deleteStoredFile(candidate.file.storageKey);
      db.transaction(tx => {
        // Keep the tombstone on a failed unlink. Once gone, delete all bounded grant history.
        const file = tx.select().from(files).where(eq(files.pasteId, candidate.paste.id)).get();
        if (file?.state !== 'deleting') return;
        tx.delete(downloadGrants).where(eq(downloadGrants.pasteId, candidate.paste.id)).run();
        tx.delete(passwordAttempts).where(eq(passwordAttempts.pasteId, candidate.paste.id)).run();
        tx.delete(files).where(eq(files.pasteId, candidate.paste.id)).run();
        tx.delete(pastes).where(and(eq(pastes.id, candidate.paste.id), eq(pastes.kind, 'file'))).run();
      }, { behavior: 'immediate' });
    } catch {
      console.error('File cleanup failed; deletion will be retried', { id: candidate.paste.id });
    }
  }
  await scanOrphanFiles(new Set(db.select({ key: files.storageKey }).from(files).all().map(row => row.key)), startup);
}

export async function cleanupFiles(startup = false) {
  if (lifecycle.pasteFileCleanup) return lifecycle.pasteFileCleanup;
  lifecycle.pasteFileCleanup = runCleanup(startup).finally(() => { lifecycle.pasteFileCleanup = undefined; });
  return lifecycle.pasteFileCleanup;
}

export async function revokeFile(id: string) {
  const found = db.transaction(tx => {
    const file = tx.select().from(files).where(eq(files.pasteId, id)).get();
    if (!file) return false;
    tx.update(files).set({ state: 'deleting' }).where(eq(files.pasteId, id)).run();
    return true;
  }, { behavior: 'immediate' });
  if (!found) throw new ApiError(NOT_FOUND, '文件不存在');
  await cleanupFiles();
}

export async function startFileLifecycle() {
  if (!lifecycle.pasteFileStartup) {
    lifecycle.pasteFileStartup = cleanupFiles(true).then(() => {
      lifecycle.pasteFileTimer = setInterval(() => {
        void cleanupFiles().catch(() => console.error('Periodic file cleanup failed; will retry'));
      }, CLEANUP_INTERVAL_MS);
      lifecycle.pasteFileTimer.unref();
    }).catch(error => { lifecycle.pasteFileStartup = undefined; throw error; });
  }
  return lifecycle.pasteFileStartup;
}
