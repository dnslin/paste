import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { pastes } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getPasteStatus } from '@/lib/paste';
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
        error(NOT_FOUND, '内容不存在'),
        { status: 404 }
      );
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
      { status: 500 }
    );
  }
}
