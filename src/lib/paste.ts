import bcrypt from 'bcryptjs';
import { and, eq, gt, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { pastes, passwordAttempts, type Paste, type PasswordAttempt } from '@/lib/db/schema';
import { decrypt } from '@/lib/crypto';
import { ApiError, NOT_FOUND, RATE_LIMITED, VALIDATION_ERROR } from '@/lib/api-response';
import { createRateLimiter } from '@/lib/rate-limit';

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
  if (paste.kind === 'file') throw new ApiError(VALIDATION_ERROR, '请使用文件下载入口');
  const status = getPasteStatus(paste);
  if (status === 'expired') throw new ApiError(NOT_FOUND, '内容已过期');
  if (status === 'destroyed') throw new ApiError(NOT_FOUND, '查看次数已用完');
  return paste;
}

const passwordRateLimiter = createRateLimiter({ maxTokens: 10, refillRate: 10, refillInterval: 60000 });

function requireUnlocked(attempt: PasswordAttempt | undefined) {
  if (attempt?.lockedUntil && attempt.lockedUntil > new Date()) {
    throw new ApiError(RATE_LIMITED, '密码错误次数过多，请在 15 分钟后重试');
  }
}

export async function readPaste(id: string, password: string | undefined, ip: string) {
  const paste = requireActive(db.select().from(pastes).where(eq(pastes.id, id)).get());
  const attemptId = `${id}:${ip}`;

  if (paste.passwordHash) {
    if (!password) throw new ApiError(VALIDATION_ERROR, '请输入密码');
    const attempt = db.select().from(passwordAttempts).where(eq(passwordAttempts.id, attemptId)).get();
    requireUnlocked(attempt);
    if (!passwordRateLimiter.consume(ip).allowed) {
      throw new ApiError(RATE_LIMITED, '验证请求过多，请稍后重试');
    }

    if (!await bcrypt.compare(password, paste.passwordHash)) {
      const remaining = db.transaction((tx) => {
        const current = tx.select().from(passwordAttempts).where(eq(passwordAttempts.id, attemptId)).get();
        requireUnlocked(current);
        const lockExpired = current?.lockedUntil && current.lockedUntil <= new Date();
        const attempts = (lockExpired ? 0 : current?.attempts ?? 0) + 1;
        const lockedUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60000) : null;
        tx.insert(passwordAttempts).values({ id: attemptId, pasteId: id, ip, attempts, lockedUntil })
          .onConflictDoUpdate({ target: passwordAttempts.id, set: { attempts, lockedUntil } }).run();
        return Math.max(0, 5 - attempts);
      }, { behavior: 'immediate' });
      throw new ApiError(VALIDATION_ERROR, `密码错误，还可尝试 ${remaining} 次`);
    }
  }

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
