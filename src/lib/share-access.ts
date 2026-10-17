import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { passwordAttempts, type PasswordAttempt } from '@/lib/db/schema';
import { ApiError, RATE_LIMITED, VALIDATION_ERROR } from '@/lib/api-response';
import { createRateLimiter } from '@/lib/rate-limit';

type ShareKind = 'text' | 'file';
const passwordRateLimiter = createRateLimiter({ maxTokens: 10, refillRate: 10, refillInterval: 60000 });

export function requireUnlocked(attempt: PasswordAttempt | undefined) {
  if (attempt?.lockedUntil && attempt.lockedUntil > new Date()) {
    throw new ApiError(RATE_LIMITED, '密码错误次数过多，请在 15 分钟后重试');
  }
}

export async function verifySharePassword(kind: ShareKind, id: string, passwordHash: string | null,
  password: string | undefined, ip: string): Promise<string> {
  const attemptId = `${kind}:${id}:${ip}`;
  if (!passwordHash) return attemptId;
  if (!password) throw new ApiError(VALIDATION_ERROR, '请输入密码');
  requireUnlocked(db.select().from(passwordAttempts).where(eq(passwordAttempts.id, attemptId)).get());
  if (!passwordRateLimiter.consume(`${kind}:${ip}`).allowed) {
    throw new ApiError(RATE_LIMITED, '验证请求过多，请稍后重试');
  }
  if (!await bcrypt.compare(password, passwordHash)) {
    const remaining = db.transaction((tx) => {
      const current = tx.select().from(passwordAttempts).where(eq(passwordAttempts.id, attemptId)).get();
      requireUnlocked(current);
      const lockExpired = current?.lockedUntil && current.lockedUntil <= new Date();
      const attempts = (lockExpired ? 0 : current?.attempts ?? 0) + 1;
      const lockedUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60000) : null;
      tx.insert(passwordAttempts).values({ id: attemptId, shareId: id, shareKind: kind, ip, attempts, lockedUntil })
        .onConflictDoUpdate({ target: passwordAttempts.id, set: { attempts, lockedUntil } }).run();
      return Math.max(0, 5 - attempts);
    }, { behavior: 'immediate' });
    throw new ApiError(VALIDATION_ERROR, `密码错误，还可尝试 ${remaining} 次`);
  }
  return attemptId;
}
