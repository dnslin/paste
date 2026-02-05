import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { pastes } from '@/lib/db/schema';
import { desc, count } from 'drizzle-orm';
import { verifySession } from '@/lib/admin/session';
import { getPasteStatus } from '@/lib/admin/utils';
import { success, error, UNAUTHORIZED, INTERNAL_ERROR } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const isAuthenticated = await verifySession();
    if (!isAuthenticated) {
      return NextResponse.json(error(UNAUTHORIZED, 'Not authenticated'), { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    const [totalResult] = await db.select({ count: count() }).from(pastes);
    const total = totalResult.count;
    const totalPages = Math.ceil(total / limit);

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
      .orderBy(desc(pastes.createdAt))
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
    }));
  } catch (err) {
    console.error('List pastes error:', err);
    return NextResponse.json(error(INTERNAL_ERROR, 'Failed to fetch pastes'), { status: 500 });
  }
}
