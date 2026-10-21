'use client'

import { useState, useEffect, useId } from 'react'
import { Eye, Trash2, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ApiResponse } from '@/lib/api-response'
import type { PasteStatus } from '@/lib/paste'
import { Pagination } from './pagination'
import { PasteDetailModal } from './paste-detail-modal'
import { DeleteConfirmModal } from './delete-confirm-modal'
import { EMPTY_RECORD_FILTERS, RecordFilters, formatRecordCreatedAt, hasRecordFilters, recordFilterParams, type RecordFilterValues } from './record-filters'

interface PasteItem {
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

type ActiveModal = { type: 'detail' | 'delete'; id: string } | null

export function PastesTable() {
  const filterFormId = useId()
  const [storedData, setData] = useState<PastesResponse | null>(null)
  const [filters, setFilters] = useState<RecordFilterValues>(EMPTY_RECORD_FILTERS)
  const [resultFilters, setResultFilters] = useState(filters)
  const data = resultFilters === filters ? storedData : null
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
        const params = new URLSearchParams({ page: String(page), limit: String(pageSize) })
        for (const [key, value] of recordFilterParams(filters)) params.set(key, value)
        const res = await fetch(`/api/admin/pastes?${params}`, { signal: controller.signal })
        const result: ApiResponse<PastesResponse> = await res.json()
        if (controller.signal.aborted) return
        if (result.success) {
          setData(result.data)
          setResultFilters(filters)
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
  }, [page, pageSize, refresh, filters])

  const applyFilters = (next: RecordFilterValues) => {
    setLoading(true)
    setError(null)
    setFilters(next)
    setPage(1)
  }

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

  return (
    <div className="space-y-4" aria-busy={loading}>
      <RecordFilters id={filterFormId} kind="text" value={filters} disabled={loading} onApply={applyFilters} />
      {loading && (
        <p role="status" className="flex items-center gap-2 text-sm text-(--text-secondary)">
          <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />
          {data ? '正在更新分享记录…' : '正在加载分享记录…'}
        </p>
      )}
      {error ? <div role="alert" className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3"><AlertCircle className="size-5 text-red-500 shrink-0" aria-hidden="true" /><p className="text-sm text-red-500">{error}</p></div>
        <Button variant="outline" size="sm" onClick={reload}>重试</Button>
      </div> : null}
      {data && !error ? <>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><p role="status" aria-live="polite" className="font-medium">找到 {data.total} 条</p><p className="text-xs text-(--text-secondary)">按创建时间倒序</p></div>
      {data.items.length === 0 ? (
        <div className="space-y-3 py-12 text-center text-(--text-secondary)"><p>{hasRecordFilters(filters) ? '没有匹配的分享' : '暂无分享记录'}</p>{hasRecordFilters(filters) ? <Button type="reset" form={filterFormId} variant="outline">清空筛选</Button> : null}</div>
      ) : (
        <div className="rounded-lg border border-(--border-subtle) overflow-x-auto">
          <table className="w-full table-fixed md:min-w-[600px] md:table-auto">
            <caption className="sr-only">分享记录及管理操作</caption>
            <thead className="bg-(--bg-elevated)">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-(--text-secondary)">编号</th>
                <th scope="col" className="hidden px-4 py-3 text-left text-sm font-medium text-(--text-secondary) md:table-cell">创建时间（北京时间）</th>
                <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-(--text-secondary) hidden md:table-cell">语言</th>
                <th scope="col" className="hidden px-4 py-3 text-left text-sm font-medium text-(--text-secondary) md:table-cell">状态</th>
                <th scope="col" className="w-24 px-2 py-3 text-right text-sm font-medium text-(--text-secondary) md:w-auto md:px-4">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--border-subtle)">
              {data.items.map((item) => (
                <tr key={item.id} className="hover:bg-(--bg-elevated)/50">
                  <td className="px-4 py-3 text-sm text-(--text-primary)">
                    <p className="font-mono [overflow-wrap:anywhere]">{item.id}</p>
                    <div className="mt-2 space-y-2 md:hidden">
                      <p className="text-xs text-(--text-secondary)"><time dateTime={item.createdAt}>{formatRecordCreatedAt(item.createdAt)}</time></p>
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[item.status]}`}>{STATUS_LABELS[item.status]}</span>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 text-sm text-(--text-primary) md:table-cell">{formatRecordCreatedAt(item.createdAt)}</td>
                  <td className="px-4 py-3 text-sm text-(--text-primary) hidden md:table-cell">{item.language}</td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[item.status]}`}>
                      {STATUS_LABELS[item.status]}
                    </span>
                  </td>
                  <td className="px-2 py-3 text-right md:px-4">
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
                          setModal({ type: 'delete', id: item.id })
                        }}
                        className="text-red-500 hover:text-red-400"
                        aria-label={`删除 ${item.id}`}
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
      </> : null}
      <PasteDetailModal
        pasteId={modal?.type === 'detail' ? modal.id : null}
        open={modal?.type === 'detail'}
        onOpenChange={(open) => { if (!open) setModal(null) }}
      />
      <DeleteConfirmModal
        pasteId={modal?.type === 'delete' ? modal.id : null}
        open={modal?.type === 'delete'}
        onOpenChange={(open) => { if (!open) setModal(null) }}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}
