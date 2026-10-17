import { and, eq, gt, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { pastes, passwordAttempts, type Paste } from '@/lib/db/schema';
import { decrypt } from '@/lib/crypto';
import { ApiError, NOT_FOUND } from '@/lib/api-response';
import { requireUnlocked, verifySharePassword } from '@/lib/share-access';

export type PasteStatus = 'active' | 'expired' | 'destroyed';

export function getPasteStatus(paste: Pick<Paste, 'expiresAt' | 'burnCount'>, now = new Date()): PasteStatus {
  if (paste.expiresAt && paste.expiresAt <= now) return 'expired';
  if (paste.burnCount !== null && paste.burnCount <= 0) return 'destroyed';
  return 'active';
}

export function decryptPaste(paste: Pick<Paste, 'encrypted' | 'content' | 'iv'>): string {
  if (!paste.encrypted) return paste.content;
  if (!paste.iv) throw new Error('Encrypted paste is missing its IV');
  return decrypt(paste.content, paste.iv);
}

function requireActive(paste: Paste | undefined): Paste {
  if (!paste) throw new ApiError(NOT_FOUND, '内容不存在');
  const status = getPasteStatus(paste);
  if (status === 'expired') throw new ApiError(NOT_FOUND, '内容已过期');
  if (status === 'destroyed') throw new ApiError(NOT_FOUND, '查看次数已用完');
  return paste;
}

export async function readPaste(id: string, password: string | undefined, ip: string) {
  const paste = requireActive(db.select().from(pastes).where(eq(pastes.id, id)).get());
  const attemptId = await verifySharePassword('text', id, paste.passwordHash, password, ip);

  // No async work inside the transaction: a successful claim owns exactly one view.
  return db.transaction((tx) => {
    const current = requireActive(tx.select().from(pastes).where(eq(pastes.id, id)).get());
    if (current.passwordHash) {
      requireUnlocked(tx.select().from(passwordAttempts).where(eq(passwordAttempts.id, attemptId)).get());
    }
    const content = decryptPaste(current);
    let remainingViews: number | null = null;
    if (current.burnCount !== null) {
      const claimed = tx.update(pastes).set({ burnCount: sql`${pastes.burnCount} - 1` })
        .where(and(eq(pastes.id, id), gt(pastes.burnCount, 0)))
        .returning({ burnCount: pastes.burnCount }).get();
      if (!claimed) throw new ApiError(NOT_FOUND, '查看次数已用完');
      remainingViews = claimed.burnCount;
    }
    if (current.passwordHash) {
      tx.delete(passwordAttempts).where(eq(passwordAttempts.id, attemptId)).run();
    }
    return { content, language: current.language ?? 'plaintext', remainingViews };
  }, { behavior: 'immediate' });
}
