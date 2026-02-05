import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { pastes } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { success, error, NOT_FOUND, INTERNAL_ERROR } from '@/lib/api-response';

export async function GET(
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

    let status: 'active' | 'expired' | 'destroyed';

    if (paste.expiresAt && paste.expiresAt < new Date()) {
      status = 'expired';
    } else if (paste.burnCount !== null && paste.burnCount <= 0) {
      status = 'destroyed';
    } else {
      status = 'active';
    }

    return NextResponse.json(
      success({
        id: paste.id,
        language: paste.language,
        hasPassword: !!paste.passwordHash,
        burnCount: paste.burnCount,
        status,
      })
    );
  } catch {
    return NextResponse.json(
      error(INTERNAL_ERROR, 'Internal server error'),
      { status: 500 }
    );
  }
}
