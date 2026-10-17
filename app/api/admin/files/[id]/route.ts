import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/admin/session'
import { deleteFileShare } from '@/lib/file-share'
import { ApiError, success, error, UNAUTHORIZED, NOT_FOUND, INTERNAL_ERROR } from '@/lib/api-response'

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await verifySession()) return NextResponse.json(error(UNAUTHORIZED, '登录已失效，请重新登录'), { status: 401 })
  const { id } = await params
  try {
    const result = await deleteFileShare(id)
    if (!result.found) return NextResponse.json(error(NOT_FOUND, '文件分享不存在'), { status: 404 })
    if (!result.deleted) return NextResponse.json(error(INTERNAL_ERROR, '已停止访问，文件清理失败，请重试'), { status: 500 })
    return NextResponse.json(success({ id }), { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    if (err instanceof ApiError && err.code === NOT_FOUND) return NextResponse.json(error(NOT_FOUND, '文件分享不存在'), { status: 404 })
    console.error('Delete file failed:', { id, error: err })
    return NextResponse.json(error(INTERNAL_ERROR, '删除未完成，请重试'), { status: 500 })
  }
}
