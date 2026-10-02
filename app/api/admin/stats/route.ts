import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { pastes } from '@/lib/db/schema';
import { count, and, or, gt, gte, isNull, sql } from 'drizzle-orm';
import { verifySession } from '@/lib/admin/session';
import { success, error, UNAUTHORIZED, INTERNAL_ERROR } from '@/lib/api-response';

export async function GET() {
  try {
    const isAuthenticated = await verifySession();
    if (!isAuthenticated) {
      return NextResponse.json(error(UNAUTHORIZED, '登录已失效，请重新登录'), { status: 401 });
    }

    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const active = and(
      or(isNull(pastes.expiresAt), gt(pastes.expiresAt, now)),
      or(isNull(pastes.burnCount), gt(pastes.burnCount, 0))
    );
    const [totals] = db.select({
      total: count(),
      todayCount: sql<number>`coalesce(sum(case when ${pastes.createdAt} >= ${todayStart.getTime() / 1000} then 1 else 0 end), 0)`,
      activeCount: sql<number>`coalesce(sum(case when ${active} then 1 else 0 end), 0)`,
    }).from(pastes).all();
    const sevenDaysAgo = new Date(todayStart.getTime() - 6 * 86400000);

    const trendData = await db
      .select({
        date: sql<string>`date(${pastes.createdAt}, 'unixepoch')`,
        count: count(),
      })
      .from(pastes)
      .where(gte(pastes.createdAt, sevenDaysAgo))
      .groupBy(sql`date(${pastes.createdAt}, 'unixepoch')`)
      .orderBy(sql`date(${pastes.createdAt}, 'unixepoch')`);

    const dailyTrend: Array<{ date: string; count: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(todayStart.getTime() - i * 86400000);
      const dateStr = date.toISOString().split('T')[0];
      const found = trendData.find((d) => d.date === dateStr);
      dailyTrend.push({ date: dateStr, count: found?.count ?? 0 });
    }

    return NextResponse.json(success({
      total: totals.total,
      todayCount: totals.todayCount,
      activeCount: totals.activeCount,
      dailyTrend,
    }));
  } catch (err) {
    console.error('Stats error:', err);
    return NextResponse.json(error(INTERNAL_ERROR, '无法加载统计，请稍后重试'), { status: 500 });
  }
}
