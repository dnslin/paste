import { NextResponse } from 'next/server'
import { verifySession } from '@/lib/admin/session'
import { cleanupFileShares } from '@/lib/file-share'
import { success, error, UNAUTHORIZED, INTERNAL_ERROR } from '@/lib/api-response'

export async function POST() {
  if (!await verifySession()) return NextResponse.json(error(UNAUTHORIZED, '登录已失效，请重新登录'), { status: 401 })
  try {
    const result = await cleanupFileShares({ scanOrphans: false })
    return NextResponse.json(success(result), { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    console.error('File cleanup failed:', err)
    return NextResponse.json(error(INTERNAL_ERROR, '清理未完成，请稍后重试'), { status: 500 })
  }
}
