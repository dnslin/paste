import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { db } from '@/lib/db';
import { pastes } from '@/lib/db/schema';
import { encrypt } from '@/lib/crypto';
import { generateId } from '@/lib/nanoid';
import { success, error, VALIDATION_ERROR, RATE_LIMITED, INTERNAL_ERROR } from '@/lib/api-response';
import { defaultRateLimiter } from '@/lib/rate-limit';

const VALID_EXPIRES = [5, 30, 60, 1440, 10080, 43200];

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    '127.0.0.1';
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateResult = defaultRateLimiter.consume(ip);
  if (!rateResult.allowed) {
    return NextResponse.json(
      error(RATE_LIMITED, 'Too many requests'),
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      error(VALIDATION_ERROR, 'Invalid JSON'),
      { status: 400 }
    );
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json(
      error(VALIDATION_ERROR, 'Request body must be an object'),
      { status: 400 }
    );
  }

  const { content, language, password, expiresIn, burnAfterRead } = body as Record<string, unknown>;

  if (typeof content !== 'string' || content.length === 0) {
    return NextResponse.json(
      error(VALIDATION_ERROR, 'Content is required'),
      { status: 400 }
    );
  }

  if (content.length > 500000) {
    return NextResponse.json(
      error(VALIDATION_ERROR, 'Content exceeds maximum length of 500000 characters'),
      { status: 400 }
    );
  }

  const lang = typeof language === 'string' && language.length > 0 ? language : 'plaintext';

  if (expiresIn !== undefined && expiresIn !== null) {
    if (typeof expiresIn !== 'number' || !VALID_EXPIRES.includes(expiresIn)) {
      return NextResponse.json(
        error(VALIDATION_ERROR, 'Invalid expiresIn value'),
        { status: 400 }
      );
    }
  }

  if (burnAfterRead !== undefined && burnAfterRead !== null) {
    if (typeof burnAfterRead !== 'number' || burnAfterRead < 1 || burnAfterRead > 10 || !Number.isInteger(burnAfterRead)) {
      return NextResponse.json(
        error(VALIDATION_ERROR, 'burnAfterRead must be an integer between 1 and 10'),
        { status: 400 }
      );
    }
  }

  let passwordHash: string | null = null;
  if (password !== undefined && password !== null) {
    if (typeof password !== 'string' || password.length === 0) {
      return NextResponse.json(
        error(VALIDATION_ERROR, 'Password must be a non-empty string'),
        { status: 400 }
      );
    }
    passwordHash = createHash('sha256').update(password).digest('hex');
  }

  const expiresAt = typeof expiresIn === 'number'
    ? new Date(Date.now() + expiresIn * 60 * 1000)
    : null;

  const { encrypted: encryptedContent, iv } = encrypt(content);
  const id = generateId();

  try {
    await db.insert(pastes).values({
      id,
      content: encryptedContent,
      language: lang,
      passwordHash,
      expiresAt,
      burnCount: typeof burnAfterRead === 'number' ? burnAfterRead : null,
      createdAt: new Date(),
      iv,
      encrypted: true,
    });
  } catch {
    return NextResponse.json(
      error(INTERNAL_ERROR, 'Failed to create paste'),
      { status: 500 }
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? `https://${request.headers.get('host')}`;

  return NextResponse.json(
    success({
      id,
      url: `${baseUrl}/${id}`,
      expiresAt: expiresAt?.toISOString() ?? null,
    }),
    { status: 201 }
  );
}
