import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { pastes } from '@/lib/db/schema';
import { desc, count } from 'drizzle-orm';
import { verifySession } from '@/lib/admin/session';
import { getPasteStatus } from '@/lib/paste';
import { success, error, UNAUTHORIZED, INTERNAL_ERROR, VALIDATION_ERROR } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const isAuthenticated = await verifySession();
    if (!isAuthenticated) {
      return NextResponse.json(error(UNAUTHORIZED, '登录已失效，请重新登录'), { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requestedPage = Number(searchParams.get('page') ?? '1');
    const limit = Number(searchParams.get('limit') ?? '15');
    if (!Number.isSafeInteger(requestedPage) || requestedPage < 1 ||
      !Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
      return NextResponse.json(error(VALIDATION_ERROR, '页码或每页数量无效'), { status: 400 });
    }

    const [totalResult] = await db.select({ count: count() }).from(pastes);
    const total = totalResult.count;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const page = Math.min(requestedPage, totalPages);
    const offset = (page - 1) * limit;

    const items = await db
      .select({
        id: pastes.id,
        createdAt: pastes.createdAt,
        language: pastes.language,
        expiresAt: pastes.expiresAt,
        burnCount: pastes.burnCount,
        passwordHash: pastes.passwordHash,
      })
      .from(pastes)
      .orderBy(desc(pastes.createdAt), desc(pastes.id))
      .limit(limit)
      .offset(offset);

    const formattedItems = items.map((item) => ({
      id: item.id,
      createdAt: item.createdAt.toISOString(),
      language: item.language || 'plaintext',
      status: getPasteStatus(item),
      hasPassword: !!item.passwordHash,
    }));

    return NextResponse.json(success({
      items: formattedItems,
      total,
      page,
      totalPages,
      pageSize: limit,
    }));
  } catch (err) {
    console.error('List pastes error:', err);
    return NextResponse.json(error(INTERNAL_ERROR, '无法加载分享记录，请稍后重试'), { status: 500 });
  }
}
