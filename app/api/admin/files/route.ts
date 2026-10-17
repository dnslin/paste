import { NextRequest, NextResponse } from 'next/server'
import { count, desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { fileShares } from '@/lib/db/schema'
import { verifySession } from '@/lib/admin/session'
import { getFileShareStatus } from '@/lib/file-share'
import { getFileStorageUsage } from '@/lib/file-storage'
import { success, error, UNAUTHORIZED, INTERNAL_ERROR, VALIDATION_ERROR } from '@/lib/api-response'
import type { AdminFilesResponse } from '@/lib/admin/file-contract'

export async function GET(request: NextRequest) {
  if (!await verifySession()) return NextResponse.json(error(UNAUTHORIZED, '登录已失效，请重新登录'), { status: 401 })
  const params = request.nextUrl.searchParams
  const requestedPage = Number(params.get('page') ?? 1)
  const pageSize = Number(params.get('limit') ?? 15)
  if (!Number.isSafeInteger(requestedPage) || requestedPage < 1 || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    return NextResponse.json(error(VALIDATION_ERROR, '页码或每页数量无效'), { status: 400 })
  }
  try {
    const total = db.select({ count: count() }).from(fileShares).get()!.count
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const page = Math.min(requestedPage, totalPages)
    const rows = db.select().from(fileShares).orderBy(desc(fileShares.createdAt), desc(fileShares.id)).limit(pageSize).offset((page - 1) * pageSize).all()
    const data: AdminFilesResponse = {
      items: rows.map((row) => ({
        id: row.id, fileName: row.fileName, size: row.size,
        createdAt: row.createdAt.toISOString(), expiresAt: row.expiresAt.toISOString(),
        downloadsRemaining: row.downloadsRemaining, hasPassword: !!row.passwordHash,
        status: getFileShareStatus(row), cleanupStatus: row.status,
      })),
      total, page, totalPages, pageSize, storage: await getFileStorageUsage(),
    }
    return NextResponse.json(success(data), { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    console.error('List files failed:', err)
    return NextResponse.json(error(INTERNAL_ERROR, '无法加载文件记录，请重试'), { status: 500 })
  }
}
