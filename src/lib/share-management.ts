import { createHash, randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { pastes, fileShares } from '@/lib/db/schema';
import { ApiError } from '@/lib/api-response';
import { getPasteStatus, deletePaste } from '@/lib/paste';
import { getFileShareStatus, deleteFileShare } from '@/lib/file-share';
import type { ShareKind, ShareManagementMetadata } from '@/lib/share-management-contract';

export const MANAGEMENT_UNAVAILABLE = 'MANAGEMENT_UNAVAILABLE';

export function createManagementToken() {
  const token = randomBytes(32).toString('base64url');
  return { token, tokenHash: createHash('sha256').update(token).digest('hex') };
}

function unavailable(): never {
  throw new ApiError(MANAGEMENT_UNAVAILABLE, '管理链接无效或分享已失效');
}

export function getManagedShare(kind: ShareKind, id: string, token: string): ShareManagementMetadata {
  const tokenHash = createHash('sha256').update(token).digest('hex');
  if (kind === 'text') {
    const paste = db.select().from(pastes).where(eq(pastes.id, id)).get();
    if (!paste?.managementTokenHash || paste.managementTokenHash !== tokenHash) unavailable();
    const status = getPasteStatus(paste);
    return { kind, id, status: status === 'destroyed' ? 'exhausted' : status, language: paste.language ?? 'plaintext',
      createdAt: paste.createdAt.toISOString(), expiresAt: paste.expiresAt?.toISOString() ?? null,
      remaining: paste.burnCount, hasPassword: !!paste.passwordHash };
  }
  const file = db.select().from(fileShares).where(eq(fileShares.id, id)).get();
  if (!file?.managementTokenHash || file.managementTokenHash !== tokenHash) unavailable();
  const status = getFileShareStatus(file);
  if (status === 'deleted') unavailable();
  return { kind, id, status, fileName: file.fileName, createdAt: file.createdAt.toISOString(),
    expiresAt: file.expiresAt.toISOString(), remaining: file.downloadsRemaining, hasPassword: !!file.passwordHash };
}

export async function revokeManagedShare(kind: ShareKind, id: string, token: string) {
  getManagedShare(kind, id, token);
  if (kind === 'text') {
    if (!deletePaste(id)) unavailable();
  } else if (!(await deleteFileShare(id)).found) unavailable();
  return { revoked: true };
}
