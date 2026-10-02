import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { pastes, passwordAttempts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifySession } from '@/lib/admin/session';
import { getPasteStatus, decryptPaste } from '@/lib/paste';
import { success, error, UNAUTHORIZED, NOT_FOUND, INTERNAL_ERROR } from '@/lib/api-response';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const isAuthenticated = await verifySession();
    if (!isAuthenticated) {
      return NextResponse.json(error(UNAUTHORIZED, '登录已失效，请重新登录'), { status: 401 });
    }

    const { id } = await params;
    
    const [paste] = await db
      .select()
      .from(pastes)
      .where(eq(pastes.id, id))
      .limit(1);

    if (!paste) {
      return NextResponse.json(error(NOT_FOUND, '内容不存在'), { status: 404 });
    }

    return NextResponse.json(success({
      id: paste.id,
      content: decryptPaste(paste),
      language: paste.language || 'plaintext',
      createdAt: paste.createdAt.toISOString(),
      expiresAt: paste.expiresAt?.toISOString() || null,
      burnCount: paste.burnCount,
      status: getPasteStatus(paste),
      hasPassword: !!paste.passwordHash,
    }));
  } catch (err) {
    console.error('Get paste error:', err);
    return NextResponse.json(error(INTERNAL_ERROR, '无法读取内容，请稍后重试'), { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const isAuthenticated = await verifySession();
    if (!isAuthenticated) {
      return NextResponse.json(error(UNAUTHORIZED, '登录已失效，请重新登录'), { status: 401 });
    }

    const { id } = await params;

    const deleted = db.transaction((tx) => {
      const result = tx.delete(pastes).where(eq(pastes.id, id)).run();
      if (result.changes) {
        tx.delete(passwordAttempts).where(eq(passwordAttempts.pasteId, id)).run();
      }
      return result.changes;
    });
    if (!deleted) {
      return NextResponse.json(error(NOT_FOUND, '内容不存在'), { status: 404 });
    }

    return NextResponse.json(success({ message: 'Paste deleted' }));
  } catch (err) {
    console.error('Delete paste error:', err);
    return NextResponse.json(error(INTERNAL_ERROR, '删除失败，请稍后重试'), { status: 500 });
  }
}
