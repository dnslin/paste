import { NextResponse } from 'next/server';
import { db } from '@/src/lib/db';
import { pastes } from '@/src/lib/db/schema';
import { count, and, or, gt, isNull } from 'drizzle-orm';
import { verifySession } from '@/lib/admin/session';
import { success, error, UNAUTHORIZED, INTERNAL_ERROR } from '@/lib/api-response';

export async function GET() {
  try {
    const isAuthenticated = await verifySession();
    if (!isAuthenticated) {
      return NextResponse.json(error(UNAUTHORIZED, 'Not authenticated'), { status: 401 });
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [totalResult] = await db.select({ count: count() }).from(pastes);
    
    const [todayResult] = await db
      .select({ count: count() })
      .from(pastes)
      .where(gt(pastes.createdAt, todayStart));

    const [activeResult] = await db
      .select({ count: count() })
      .from(pastes)
      .where(
        and(
          or(isNull(pastes.expiresAt), gt(pastes.expiresAt, now)),
          or(isNull(pastes.burnCount), gt(pastes.burnCount, 0))
        )
      );

    return NextResponse.json(success({
      total: totalResult.count,
      todayCount: todayResult.count,
      activeCount: activeResult.count,
    }));
  } catch (err) {
    console.error('Stats error:', err);
    return NextResponse.json(error(INTERNAL_ERROR, 'Failed to fetch stats'), { status: 500 });
  }
}
