import bcrypt from 'bcryptjs';
import { and, eq, gt, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { fileShares, passwordAttempts, type FileShare } from '@/lib/db/schema';
import { ApiError, NOT_FOUND, VALIDATION_ERROR } from '@/lib/api-response';
import { generateId } from '@/lib/nanoid';
import { getPasswordError } from '@/lib/paste-rules';
import { FILE_DOWNLOAD_LIMITS, FILE_EXPIRES } from '@/lib/file-rules';
import type { FileShareMetadata, FileShareStatus } from '@/lib/file-share-contract';
import { requireUnlocked, verifySharePassword } from '@/lib/share-access';
import { validateFile } from '@/lib/file-validation';
import { storeFile, readStoredFile, removeStoredFile, removeOrphanFiles, retryOrphanFiles, queueOrphanCleanup } from '@/lib/file-storage';

export function getFileShareStatus(share: Pick<FileShare, 'status' | 'expiresAt' | 'downloadsRemaining'>, now = new Date()): FileShareStatus {
  if (share.status !== 'active') return 'deleted';
  if (share.expiresAt <= now) return 'expired';
  if (share.downloadsRemaining !== null && share.downloadsRemaining <= 0) return 'exhausted';
  return 'active';
}

export function getFileShareMetadata(id: string): FileShareMetadata | null {
  const share = db.select().from(fileShares).where(eq(fileShares.id, id)).get();
  if (!share) return null;
  const status = getFileShareStatus(share);
  return { id, status, hasPassword: !!share.passwordHash, expiresAt: share.expiresAt.toISOString(), downloadsRemaining: share.downloadsRemaining,
    ...(!share.passwordHash && status === 'active' ? { fileName: share.fileName, size: share.size } : {}) };
}

function requireActive(share: FileShare | undefined): FileShare {
  if (!share) throw new ApiError(NOT_FOUND, '文件分享不存在');
  const status = getFileShareStatus(share);
  if (status === 'expired') throw new ApiError('FILE_EXPIRED', '分享已过期');
  if (status === 'exhausted') throw new ApiError('FILE_EXHAUSTED', '下载次数已用完');
  if (status !== 'active') throw new ApiError(NOT_FOUND, '分享已删除');
  return share;
}

export async function createFileShare(input: { fileName: string; bytes: Buffer; password?: string; expiresIn?: number; downloadLimit?: number | null; signal?: AbortSignal }) {
  const expiresIn = input.expiresIn ?? 1440;
  const downloadLimit = input.downloadLimit ?? null;
  if (!FILE_EXPIRES.includes(expiresIn)) throw new ApiError(VALIDATION_ERROR, '无效的过期时间');
  if (downloadLimit !== null && !FILE_DOWNLOAD_LIMITS.includes(downloadLimit)) throw new ApiError(VALIDATION_ERROR, '无效的下载次数');
  const passwordError = input.password ? getPasswordError(input.password) : null;
  if (passwordError) throw new ApiError(VALIDATION_ERROR, passwordError);
  const fileName = validateFile(input.fileName, input.bytes);
  const passwordHash = input.password ? await bcrypt.hash(input.password, 10) : null;
  if (input.signal?.aborted) throw new ApiError('REQUEST_ABORTED', '请求已取消');
  const stored = await storeFile(input.bytes);
  try {
    if (input.signal?.aborted) throw new ApiError('REQUEST_ABORTED', '请求已取消');
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + expiresIn * 60000);
    const id = generateId();
    db.insert(fileShares).values({ id, storageKey: stored.storageKey, fileName, size: input.bytes.length,
      passwordHash, expiresAt, downloadsRemaining: downloadLimit, createdAt }).run();
    return { id, expiresAt: expiresAt.toISOString(), downloadLimit };
  } catch (error) {
    try { await removeStoredFile(stored.storageKey); }
    catch (cleanupError) { queueOrphanCleanup(stored.storageKey); console.error(`Cleanup after failed file creation ${stored.storageKey}:`, cleanupError); }
    throw error;
  } finally { stored.finish(); }
}

export async function claimFileDownload(id: string, password: string | undefined, ip: string, signal?: AbortSignal) {
  const share = requireActive(db.select().from(fileShares).where(eq(fileShares.id, id)).get());
  const attemptId = await verifySharePassword('file', id, share.passwordHash, password, ip);
  const bytes = await readStoredFile(share.storageKey, share.size);
  if (signal?.aborted) throw new ApiError('REQUEST_ABORTED', '请求已取消');
  // IO and bcrypt complete before this short, atomic claim.
  return db.transaction((tx) => {
    const current = requireActive(tx.select().from(fileShares).where(eq(fileShares.id, id)).get());
    if (current.passwordHash) requireUnlocked(tx.select().from(passwordAttempts).where(eq(passwordAttempts.id, attemptId)).get());
    let downloadsRemaining: number | null = null;
    if (current.downloadsRemaining !== null) {
      const claimed = tx.update(fileShares).set({ downloadsRemaining: sql`${fileShares.downloadsRemaining} - 1` })
        .where(and(eq(fileShares.id, id), gt(fileShares.downloadsRemaining, 0)))
        .returning({ downloadsRemaining: fileShares.downloadsRemaining }).get();
      if (!claimed) throw new ApiError('FILE_EXHAUSTED', '下载次数已用完');
      downloadsRemaining = claimed.downloadsRemaining;
    }
    if (current.passwordHash) tx.delete(passwordAttempts).where(eq(passwordAttempts.id, attemptId)).run();
    return { bytes, fileName: current.fileName, downloadsRemaining };
  }, { behavior: 'immediate' });
}

export async function deleteFileShare(id: string): Promise<{ found: boolean; deleted: boolean }> {
  const share = db.update(fileShares).set({ status: 'pending_delete' }).where(eq(fileShares.id, id)).returning().get();
  if (!share) return { found: false, deleted: false };
  try {
    await removeStoredFile(share.storageKey);
    db.transaction((tx) => {
      tx.delete(passwordAttempts).where(and(eq(passwordAttempts.shareKind, 'file'), eq(passwordAttempts.shareId, id))).run();
      tx.delete(fileShares).where(eq(fileShares.id, id)).run();
    }, { behavior: 'immediate' });
    return { found: true, deleted: true };
  } catch (error) {
    console.error(`File share deletion failed for ${id} (${share.storageKey}):`, error);
    db.update(fileShares).set({ status: 'delete_failed' }).where(eq(fileShares.id, id)).run();
    return { found: true, deleted: false };
  }
}

export async function cleanupFileShares({ scanOrphans = false }: { scanOrphans?: boolean } = {}) {
  const result = { removed: 0, failed: 0, orphansRemoved: 0, orphansFailed: 0 };
  const shares = db.select().from(fileShares).all();
  for (const share of shares) {
    if (getFileShareStatus(share) === 'active') continue;
    const deletion = await deleteFileShare(share.id);
    if (deletion.deleted) result.removed++;
    else if (deletion.found) result.failed++;
  }
  const retry = await retryOrphanFiles((key) => !!db.select({ id: fileShares.id }).from(fileShares).where(eq(fileShares.storageKey, key)).get());
  result.orphansRemoved = retry.removed;
  result.orphansFailed = retry.failed;
  if (scanOrphans) {
    const referenced = new Set(db.select({ key: fileShares.storageKey }).from(fileShares).all().map((share) => share.key));
    const orphans = await removeOrphanFiles(referenced);
    result.orphansRemoved += orphans.removed;
    result.orphansFailed += orphans.failed;
  }
  return result;
}
