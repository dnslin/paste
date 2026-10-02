import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { pastes } from '@/lib/db/schema';
import { encrypt } from '@/lib/crypto';
import { generateId } from '@/lib/nanoid';
import { success, error, VALIDATION_ERROR, RATE_LIMITED, INTERNAL_ERROR } from '@/lib/api-response';
import { defaultRateLimiter } from '@/lib/rate-limit';
import { MAX_CONTENT_LENGTH, VALID_EXPIRES, getPasswordError } from '@/lib/paste-rules';
import { normalizeLanguage } from '@/lib/languages';
import { getClientIp, getPublicOrigin } from '@/lib/request-client';

export async function POST(request: NextRequest) {
  if (!defaultRateLimiter.consume(getClientIp(request)).allowed) {
    return NextResponse.json(error(RATE_LIMITED, '创建请求过多，请稍后重试'), { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(error(VALIDATION_ERROR, '请求不是有效的 JSON'), { status: 400 });
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return NextResponse.json(error(VALIDATION_ERROR, '请求内容必须是对象'), { status: 400 });
  }
  const { content, language, password, expiresIn, burnAfterRead } = body as Record<string, unknown>;
  if (typeof content !== 'string' || !content.trim()) {
    return NextResponse.json(error(VALIDATION_ERROR, '请输入内容'), { status: 400 });
  }
  if (content.length > MAX_CONTENT_LENGTH) {
    return NextResponse.json(error(VALIDATION_ERROR, `内容最多 ${MAX_CONTENT_LENGTH} 个字符`), { status: 400 });
  }
  const lang = language === undefined ? 'plaintext' : typeof language === 'string' ? normalizeLanguage(language) : null;
  if (!lang) {
    return NextResponse.json(error(VALIDATION_ERROR, '不支持所选语言'), { status: 400 });
  }
  if (expiresIn !== undefined && expiresIn !== null &&
    (typeof expiresIn !== 'number' || !VALID_EXPIRES.includes(expiresIn))) {
    return NextResponse.json(error(VALIDATION_ERROR, '无效的过期时间'), { status: 400 });
  }
  if (burnAfterRead !== undefined && burnAfterRead !== null &&
    (typeof burnAfterRead !== 'number' || !Number.isInteger(burnAfterRead) || burnAfterRead < 1 || burnAfterRead > 10)) {
    return NextResponse.json(error(VALIDATION_ERROR, '查看次数必须是 1 到 10 的整数'), { status: 400 });
  }
  if (password !== undefined && password !== null && typeof password !== 'string') {
    return NextResponse.json(error(VALIDATION_ERROR, '密码必须是字符串'), { status: 400 });
  }
  const passwordError = typeof password === 'string' ? getPasswordError(password) : null;
  if (passwordError) {
    return NextResponse.json(error(VALIDATION_ERROR, passwordError), { status: 400 });
  }

  try {
    const passwordHash = typeof password === 'string' && password !== '' ? await bcrypt.hash(password, 10) : null;
    const expiresAt = typeof expiresIn === 'number' ? new Date(Date.now() + expiresIn * 60000) : null;
    const { encrypted, iv } = encrypt(content);
    const id = generateId();
    const url = new URL(id, `${getPublicOrigin(request)}/`).href;
    db.insert(pastes).values({ id, content: encrypted, language: lang, passwordHash, expiresAt,
      burnCount: typeof burnAfterRead === 'number' ? burnAfterRead : null,
      createdAt: new Date(), iv, encrypted: true }).run();
    return NextResponse.json(success({ id, url, expiresAt: expiresAt?.toISOString() ?? null }), { status: 201 });
  } catch (err) {
    console.error('Create paste failed:', err);
    return NextResponse.json(error(INTERNAL_ERROR, '创建失败，请稍后重试'), { status: 500 });
  }
}
