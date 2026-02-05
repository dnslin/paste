import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { pastes } from '@/lib/db/schema';
import { count, and, or, gt, isNull, sql } from 'drizzle-orm';
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

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const trendData = await db
      .select({
        date: sql<string>`date(${pastes.createdAt}, 'unixepoch')`,
        count: count(),
      })
      .from(pastes)
      .where(gt(pastes.createdAt, sevenDaysAgo))
      .groupBy(sql`date(${pastes.createdAt}, 'unixepoch')`)
      .orderBy(sql`date(${pastes.createdAt}, 'unixepoch')`);

    const dailyTrend: Array<{ date: string; count: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const found = trendData.find((d) => d.date === dateStr);
      dailyTrend.push({ date: dateStr, count: found?.count ?? 0 });
    }

    return NextResponse.json(success({
      total: totalResult.count,
      todayCount: todayResult.count,
      activeCount: activeResult.count,
      dailyTrend,
    }));
  } catch (err) {
    console.error('Stats error:', err);
    return NextResponse.json(error(INTERNAL_ERROR, 'Failed to fetch stats'), { status: 500 });
  }
}
