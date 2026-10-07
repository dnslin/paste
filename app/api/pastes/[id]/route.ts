import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { pastes, files } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { FILE_HEADERS } from '@/lib/file-http';
import { getPasteStatus } from '@/lib/paste';
import { success, error, NOT_FOUND, INTERNAL_ERROR } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const [paste] = await db.select().from(pastes).where(eq(pastes.id, id)).limit(1);

    if (!paste) {
      return NextResponse.json(
        error(NOT_FOUND, '内容不存在'),
        { status: 404, headers: FILE_HEADERS }
      );
    }

    if (paste.kind === 'file') {
      const file = db.select({ state: files.state }).from(files).where(eq(files.pasteId, id)).get();
      return NextResponse.json(success({ id: paste.id, kind: 'file', hasPassword: !!paste.passwordHash,
        burnCount: paste.burnCount, status: !file || file.state !== 'ready' ? 'not_found' : getPasteStatus(paste)
      }), { headers: FILE_HEADERS });
    }

    return NextResponse.json(
      success({
        id: paste.id,
        language: paste.language,
        hasPassword: !!paste.passwordHash,
        burnCount: paste.burnCount,
        status: getPasteStatus(paste),
      })
    );
  } catch (err) {
    console.error(`Get paste ${id} metadata failed:`, err);
    return NextResponse.json(
      error(INTERNAL_ERROR, '服务发生错误，请稍后重试'),
      { status: 500, headers: FILE_HEADERS }
    );
  }
}
