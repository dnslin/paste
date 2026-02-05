import { NextRequest, NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'crypto';
import { db } from '@/src/lib/db';
import { pastes, passwordAttempts } from '@/src/lib/db/schema';
import { eq } from 'drizzle-orm';
import { decrypt } from '@/src/lib/crypto';
import { success, error, NOT_FOUND, VALIDATION_ERROR, RATE_LIMITED, INTERNAL_ERROR } from '@/src/lib/api-response';

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    '127.0.0.1';
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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

  const { password } = body as Record<string, unknown>;

  if (typeof password !== 'string' || password.length === 0) {
    return NextResponse.json(
      error(VALIDATION_ERROR, 'Password is required'),
      { status: 400 }
    );
  }

  if (password.length > 1000) {
    return NextResponse.json(
      error(VALIDATION_ERROR, 'Password too long'),
      { status: 400 }
    );
  }

  try {
    const [paste] = await db.select().from(pastes).where(eq(pastes.id, id)).limit(1);

    if (!paste) {
      return NextResponse.json(
        error(NOT_FOUND, 'Paste not found'),
        { status: 404 }
      );
    }

    if (paste.expiresAt && paste.expiresAt < new Date()) {
      return NextResponse.json(
        error(NOT_FOUND, 'Paste has expired'),
        { status: 404 }
      );
    }

    if (paste.burnCount !== null && paste.burnCount <= 0) {
      return NextResponse.json(
        error(NOT_FOUND, 'Paste has been destroyed'),
        { status: 404 }
      );
    }

    if (!paste.passwordHash) {
      const content = decrypt(paste.content, paste.iv!);
      return NextResponse.json(
        success({ content, language: paste.language }),
        { status: 200 }
      );
    }

    const ip = getClientIp(request);
    const attemptId = `${id}:${ip}`;

    const [attempt] = await db
      .select()
      .from(passwordAttempts)
      .where(eq(passwordAttempts.id, attemptId))
      .limit(1);

    if (attempt?.lockedUntil && attempt.lockedUntil > new Date()) {
      const remainingMs = attempt.lockedUntil.getTime() - Date.now();
      const remainingMinutes = Math.ceil(remainingMs / 60000);
      return NextResponse.json(
        error(RATE_LIMITED, `Too many attempts. Try again in ${remainingMinutes} minutes`),
        { status: 429 }
      );
    }

    const passwordHash = createHash('sha256').update(password).digest('hex');
    const storedHash = paste.passwordHash;

    const isValidPassword = storedHash.length === passwordHash.length &&
      timingSafeEqual(Buffer.from(passwordHash, 'hex'), Buffer.from(storedHash, 'hex'));

    if (!isValidPassword) {
      const currentAttempts = (attempt?.attempts ?? 0) + 1;
      const lockedUntil = currentAttempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;

      if (attempt) {
        await db
          .update(passwordAttempts)
          .set({ attempts: currentAttempts, lockedUntil })
          .where(eq(passwordAttempts.id, attemptId));
      } else {
        await db.insert(passwordAttempts).values({
          id: attemptId,
          pasteId: id,
          ip,
          attempts: currentAttempts,
          lockedUntil,
        });
      }

      const remainingAttempts = Math.max(0, 5 - currentAttempts);
      return NextResponse.json(
        error(VALIDATION_ERROR, `Invalid password. ${remainingAttempts} attempts remaining`),
        { status: 400 }
      );
    }

    if (attempt) {
      await db
        .update(passwordAttempts)
        .set({ attempts: 0, lockedUntil: null })
        .where(eq(passwordAttempts.id, attemptId));
    }

    const content = decrypt(paste.content, paste.iv!);

    // Handle burn-after-read for password-protected pastes
    let remainingViews: number | null = null;
    if (paste.burnCount !== null && paste.burnCount > 0) {
      const result = await db
        .update(pastes)
        .set({ burnCount: paste.burnCount - 1 })
        .where(eq(pastes.id, id))
        .returning({ burnCount: pastes.burnCount });
      remainingViews = result[0]?.burnCount ?? 0;
    } else if (paste.burnCount !== null) {
      remainingViews = paste.burnCount;
    }

    return NextResponse.json(
      success({ content, language: paste.language, remainingViews }),
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      error(INTERNAL_ERROR, 'Internal server error'),
      { status: 500 }
    );
  }
}
