import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createSession } from '@/lib/admin/session';
import { createRateLimiter } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/request-client';
import { getPasswordError } from '@/lib/paste-rules';
import { success, error, UNAUTHORIZED, INTERNAL_ERROR, VALIDATION_ERROR, RATE_LIMITED } from '@/lib/api-response';

const loginRateLimiter = createRateLimiter({ maxTokens: 5, refillRate: 5, refillInterval: 60000 });

export async function POST(request: NextRequest) {
  if (!loginRateLimiter.consume(getClientIp(request)).allowed) {
    return NextResponse.json(error(RATE_LIMITED, '登录请求过多，请在一分钟后重试'), { status: 429 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(error(VALIDATION_ERROR, '请求不是有效的 JSON'), { status: 400 });
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body) ||
    !('password' in body) || typeof body.password !== 'string' || !body.password || getPasswordError(body.password)) {
    return NextResponse.json(error(VALIDATION_ERROR, '请输入有效密码（最多 72 个 UTF-8 字节）'), { status: 400 });
  }
  try {
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
    if (!adminPasswordHash) throw new Error('ADMIN_PASSWORD_HASH not configured');
    if (!await bcrypt.compare(body.password, adminPasswordHash)) {
      return NextResponse.json(error(UNAUTHORIZED, '密码错误'), { status: 401 });
    }
    await createSession();
    return NextResponse.json(success({ message: '登录成功' }));
  } catch (err) {
    console.error('Login failed:', err);
    return NextResponse.json(error(INTERNAL_ERROR, '登录失败，请稍后重试'), { status: 500 });
  }
}
