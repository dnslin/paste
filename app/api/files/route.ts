import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { files, pastes } from '@/lib/db/schema';
import { verifySession } from '@/lib/admin/session';
import { success, error, UNAUTHORIZED, RATE_LIMITED } from '@/lib/api-response';
import { createRateLimiter } from '@/lib/rate-limit';
import { getClientIp, getPublicOrigin } from '@/lib/request-client';
import { generateId } from '@/lib/nanoid';
import { acquirePayloadSlot, reserveUpload, storeFile, deleteStoredFile } from '@/lib/file-storage';
import { parseFileUpload } from '@/lib/file-upload';
import { UPLOAD_TIMEOUT_MS } from '@/lib/file-config';
import { fileJson, fileError, requireSameOrigin, requestDeadline } from '@/lib/file-http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const limiter = createRateLimiter({ maxTokens: 10, refillRate: 10, refillInterval: 60000 });

export async function POST(request: NextRequest) {
  const deadline = requestDeadline(request, UPLOAD_TIMEOUT_MS);
  let releaseSlot: (() => void) | undefined, releaseQuota: (() => void) | undefined;
  let stored: Awaited<ReturnType<typeof storeFile>> | undefined;
  let committed = false;
  try {
    // These gates must execute before touching the body or reserving a payload buffer.
    if (!await verifySession()) return fileJson(error(UNAUTHORIZED, '请先登录管理员账号'), 401);
    requireSameOrigin(request, true);
    if (!limiter.consume(getClientIp(request)).allowed) return fileJson(error(RATE_LIMITED, '上传请求过多，请稍后重试'), 429);
    deadline.signal.throwIfAborted();
    releaseSlot = acquirePayloadSlot(); releaseQuota = await reserveUpload();
    deadline.signal.throwIfAborted();
    const upload = await parseFileUpload(request, deadline.signal);
    const passwordHash = upload.password ? await bcrypt.hash(upload.password, 10) : null;
    deadline.signal.throwIfAborted();
    const id = generateId();
    stored = await storeFile(id, upload.bytes, deadline.signal);
    deadline.signal.throwIfAborted();
    const expiresAt = new Date(Math.floor((Date.now() + upload.expiresIn * 60000) / 1000) * 1000);
    db.transaction(tx => {
      tx.insert(pastes).values({ id, kind: 'file', content: '', passwordHash, expiresAt, burnCount: upload.burnAfterRead, createdAt: new Date() }).run();
      tx.insert(files).values({ pasteId: id, fileName: upload.fileName, size: stored!.size, storageKey: stored!.storageKey,
        encryptionVersion: stored!.encryptionVersion, nonce: stored!.nonce, tag: stored!.tag }).run();
    }, { behavior: 'immediate' });
    committed = true;
    return fileJson(success({ id, url: new URL(id, `${getPublicOrigin(request)}/`).href, expiresAt: expiresAt.toISOString() }), 201);
  } catch (err) { return fileError(err); }
  finally {
    if (stored && !committed) {
      try { await deleteStoredFile(stored.storageKey); }
      catch { console.error('Unpublished file cleanup failed; orphan recovery will retry'); }
    }
    stored?.releaseActive(); releaseQuota?.(); releaseSlot?.(); deadline.clear();
  }
}
