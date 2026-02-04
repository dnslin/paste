import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/lib/db';
import { pastes } from '@/src/lib/db/schema';
import { eq, sql, and, gt } from 'drizzle-orm';
import { success, error, NOT_FOUND, VALIDATION_ERROR, INTERNAL_ERROR } from '@/src/lib/api-response';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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

    if (paste.passwordHash) {
      return NextResponse.json(
        error(VALIDATION_ERROR, 'Password-protected paste must be accessed via verify endpoint'),
        { status: 400 }
      );
    }

    if (paste.burnCount === null) {
      return NextResponse.json(
        success({ remainingViews: null })
      );
    }

    const result = await db
      .update(pastes)
      .set({ burnCount: sql`MAX(0, burn_count - 1)` })
      .where(
        and(
          eq(pastes.id, id),
          gt(pastes.burnCount, 0)
        )
      )
      .returning({ burnCount: pastes.burnCount });

    const remainingViews = result[0]?.burnCount ?? 0;

    return NextResponse.json(
      success({ remainingViews })
    );
  } catch {
    return NextResponse.json(
      error(INTERNAL_ERROR, 'Internal server error'),
      { status: 500 }
    );
  }
}
