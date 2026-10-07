'use client'

import { useState, useEffect } from 'react'
import { Eye, Trash2, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ApiResponse } from '@/lib/api-response'
import type { PasteStatus } from '@/lib/paste'
import { Pagination } from './pagination'
import { PasteDetailModal } from './paste-detail-modal'
import { DeleteConfirmModal } from './delete-confirm-modal'

interface PasteItem {
  kind?: 'text' | 'file'
  id: string
  createdAt: string
  language: string
  status: PasteStatus
  hasPassword: boolean
}

interface PastesResponse {
  items: PasteItem[]
  total: number
  page: number
  totalPages: number
  pageSize: number
}

const STATUS_LABELS = { active: '可访问', expired: '已过期', destroyed: '查看次数已用尽' }
const STATUS_STYLES = {
  active: 'bg-green-500/20 text-green-400',
  expired: 'bg-zinc-500/20 text-zinc-400',
  destroyed: 'bg-red-500/20 text-red-400',
}

type ActiveModal = { type: 'detail' | 'delete'; id: string; kind?: 'text' | 'file' } | null

export function PastesTable() {
  const [data, setData] = useState<PastesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)
  const [refresh, setRefresh] = useState(0)
  const [modal, setModal] = useState<ActiveModal>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function loadPastes() {
      try {
        const res = await fetch(`/api/admin/pastes?page=${page}&limit=${pageSize}`, { signal: controller.signal })
        const result: ApiResponse<PastesResponse> = await res.json()
        if (controller.signal.aborted) return
        if (result.success) {
          setData(result.data)
          setPage(result.data.page)
        } else {
          setError(result.error.message)
        }
      } catch {
        if (!controller.signal.aborted) setError('无法加载分享记录，请重试。')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    loadPastes()
    return () => controller.abort()
  }, [page, pageSize, refresh])

  const reload = () => {
    setLoading(true)
    setError(null)
    setRefresh((value) => value + 1)
  }

  const handlePageChange = (nextPage: number) => {
    setLoading(true)
    setError(null)
    setPage(nextPage)
  }

  const handlePageSizeChange = (size: number) => {
    setLoading(true)
    setError(null)
    setPageSize(size)
    setPage(1)
  }

  const handleDeleteConfirm = () => {
    if (data && data.items.length === 1 && data.page > 1) {
      handlePageChange(data.page - 1)
    } else {
      reload()
    }
  }

  if (loading && !data) {
    return (
      <div role="status" className="flex items-center justify-center gap-2 py-12 text-(--text-secondary)">
        <Loader2 className="size-6 motion-safe:animate-spin" aria-hidden="true" />
        正在加载分享记录…
      </div>
    )
  }

  if (error) {
    return (
      <div role="alert" className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="size-5 text-red-500 shrink-0" aria-hidden="true" />
          <p className="text-sm text-red-500">{error}</p>
        </div>
        <Button variant="outline" size="sm" onClick={reload}>重试</Button>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-4" aria-busy={loading}>
      {loading && (
        <p role="status" className="flex items-center gap-2 text-sm text-(--text-secondary)">
          <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />
          正在更新分享记录…
        </p>
      )}
      {data.items.length === 0 ? (
        <p className="text-center py-12 text-(--text-secondary)">暂无分享记录</p>
      ) : (
        <div className="rounded-lg border border-(--border-subtle) overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <caption className="sr-only">分享记录及管理操作</caption>
            <thead className="bg-(--bg-elevated)">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-(--text-secondary)">编号</th>
                <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-(--text-secondary)">创建时间</th>
                <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-(--text-secondary) hidden md:table-cell">类型 / 语言</th>
                <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-(--text-secondary)">状态</th>
                <th scope="col" className="px-4 py-3 text-right text-sm font-medium text-(--text-secondary)">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--border-subtle)">
              {data.items.map((item) => (
                <tr key={item.id} className="hover:bg-(--bg-elevated)/50">
                  <td className="px-4 py-3 font-mono text-sm text-(--text-primary)">{item.id}</td>
                  <td className="px-4 py-3 text-sm text-(--text-primary)">{new Date(item.createdAt).toLocaleString('zh-CN')}</td>
                  <td className="px-4 py-3 text-sm text-(--text-primary) hidden md:table-cell">{item.kind === 'file' ? '文件' : item.language}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[item.status]}`}>
                      {item.kind === 'file' && item.status === 'destroyed' ? '领取次数已用尽' : STATUS_LABELS[item.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={loading}
                        onClick={() => {
                          setModal({ type: 'detail', id: item.id })
                        }}
                        aria-label={`查看 ${item.id}`}
                      >
                        <Eye className="size-4" aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={loading}
                        onClick={() => {
                          setModal({ type: 'delete', id: item.id, kind: item.kind })
                        }}
                        className="text-red-500 hover:text-red-400"
                        aria-label={`${item.kind === 'file' ? '撤销' : '删除'} ${item.id}`}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        page={data.page}
        totalPages={data.totalPages}
        total={data.total}
        pageSize={data.pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />
      <PasteDetailModal
        pasteId={modal?.type === 'detail' ? modal.id : null}
        open={modal?.type === 'detail'}
        onOpenChange={(open) => { if (!open) setModal(null) }}
      />
      <DeleteConfirmModal
        kind={modal?.kind}
        pasteId={modal?.type === 'delete' ? modal.id : null}
        open={modal?.type === 'delete'}
        onOpenChange={(open) => { if (!open) setModal(null) }}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}
