import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/lib/db';
import { pastes } from '@/src/lib/db/schema';
import { eq } from 'drizzle-orm';
import { decrypt } from '@/src/lib/crypto';
import { verifySession } from '@/lib/admin/session';
import { success, error, UNAUTHORIZED, NOT_FOUND, INTERNAL_ERROR } from '@/lib/api-response';

function getPasteStatus(paste: { expiresAt: Date | null; burnCount: number | null }): string {
  const now = new Date();
  if (paste.expiresAt && paste.expiresAt < now) return 'expired';
  if (paste.burnCount !== null && paste.burnCount <= 0) return 'destroyed';
  return 'active';
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const isAuthenticated = await verifySession();
    if (!isAuthenticated) {
      return NextResponse.json(error(UNAUTHORIZED, 'Not authenticated'), { status: 401 });
    }

    const { id } = await params;
    
    const [paste] = await db
      .select()
      .from(pastes)
      .where(eq(pastes.id, id))
      .limit(1);

    if (!paste) {
      return NextResponse.json(error(NOT_FOUND, 'Paste not found'), { status: 404 });
    }

    let content = paste.content;
    if (paste.encrypted && paste.iv) {
      try {
        content = decrypt(paste.content, paste.iv);
      } catch {
        content = '[Decryption failed]';
      }
    }

    return NextResponse.json(success({
      id: paste.id,
      content,
      language: paste.language || 'plaintext',
      createdAt: paste.createdAt.toISOString(),
      expiresAt: paste.expiresAt?.toISOString() || null,
      burnCount: paste.burnCount,
      status: getPasteStatus(paste),
      hasPassword: !!paste.passwordHash,
    }));
  } catch (err) {
    console.error('Get paste error:', err);
    return NextResponse.json(error(INTERNAL_ERROR, 'Failed to fetch paste'), { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const isAuthenticated = await verifySession();
    if (!isAuthenticated) {
      return NextResponse.json(error(UNAUTHORIZED, 'Not authenticated'), { status: 401 });
    }

    const { id } = await params;

    const result = await db.delete(pastes).where(eq(pastes.id, id));

    // Check if any row was deleted (better-sqlite3 returns changes count)
    if ((result as { changes?: number }).changes === 0) {
      return NextResponse.json(error(NOT_FOUND, 'Paste not found'), { status: 404 });
    }

    return NextResponse.json(success({ message: 'Paste deleted' }));
  } catch (err) {
    console.error('Delete paste error:', err);
    return NextResponse.json(error(INTERNAL_ERROR, 'Failed to delete paste'), { status: 500 });
  }
}
