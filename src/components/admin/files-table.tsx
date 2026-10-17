'use client'

import { useEffect, useRef, useState } from 'react'
import { Eye, Trash2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { ApiResponse } from '@/lib/api-response'
import type { AdminFileItem, AdminFilesResponse } from '@/lib/admin/file-contract'
import { formatBytes } from '@/components/file-share/presentation'
import { Pagination } from './pagination'

function statusLabel(item: AdminFileItem) {
  if (item.cleanupStatus === 'delete_failed') return '清理失败，等待重试'
  if (item.cleanupStatus === 'pending_delete') return '等待清理'
  if (item.status === 'expired') return '已过期，等待清理'
  if (item.status === 'exhausted') return '次数用尽，等待清理'
  return '可访问'
}

export function FilesTable() {
  const [data, setData] = useState<AdminFilesResponse | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)
  const [refresh, setRefresh] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [modal, setModal] = useState<{ kind: 'detail' | 'delete'; item: AdminFileItem } | null>(null)
  const [actionError, setActionError] = useState('')
  const [acting, setActing] = useState(false)
  const actionPending = useRef(false)

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const res = await fetch(`/api/admin/files?page=${page}&limit=${pageSize}`, { signal: controller.signal })
        const result: ApiResponse<AdminFilesResponse> = await res.json()
        if (controller.signal.aborted) return
        if (!res.ok || !result.success) throw new Error(result.success ? '无法加载文件记录' : result.error.message)
        setData(result.data)
        setPage(result.data.page)
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : '无法加载文件记录，请重试')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void load()
    return () => controller.abort()
  }, [page, pageSize, refresh])

  function reload() {
    setLoading(true)
    setError('')
    setRefresh((value) => value + 1)
  }

  async function remove() {
    if (!modal || actionPending.current) return
    actionPending.current = true
    setActing(true)
    setActionError('')
    try {
      const res = await fetch(`/api/admin/files/${encodeURIComponent(modal.item.id)}`, { method: 'DELETE' })
      const result: ApiResponse<{ id: string }> = await res.json()
      if (!res.ok || !result.success) throw new Error(result.success ? '删除未完成，请重试' : result.error.message)
      setNotice(`已删除 ${modal.item.fileName}`)
      setModal(null)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '删除未完成，请重试')
    } finally {
      actionPending.current = false
      setActing(false)
      reload()
    }
  }

  async function cleanup() {
    if (actionPending.current) return
    actionPending.current = true
    setActing(true)
    setNotice('')
    try {
      const res = await fetch('/api/admin/files/cleanup', { method: 'POST' })
      const result: ApiResponse<{ removed: number; failed: number; orphansRemoved: number; orphansFailed: number }> = await res.json()
      if (!res.ok || !result.success) throw new Error(result.success ? '清理未完成，请重试' : result.error.message)
      const removed = result.data.removed + result.data.orphansRemoved
      const failed = result.data.failed + result.data.orphansFailed
      setNotice(failed ? `已清理 ${removed} 个，${failed} 个等待重试` : `已清理 ${removed} 个文件`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '清理未完成，请重试')
    } finally {
      actionPending.current = false
      setActing(false)
      // Keep the action error visible while refreshing the actual storage usage.
      setLoading(true)
      setRefresh((value) => value + 1)
    }
  }

  return <div className="space-y-5" aria-busy={loading || acting}>
    {data ? <div className="grid grid-cols-3 gap-4 border-y border-(--border-subtle) py-5">
      {[
        { label: '文件数量', value: data.total.toLocaleString() },
        { label: '文件占用', value: formatBytes(data.storage.usedBytes) },
        { label: '可用空间', value: formatBytes(Math.max(0, data.storage.limitBytes - data.storage.usedBytes - data.storage.reservedBytes)) },
      ].map(({ label, value }) => <div key={label} className="min-w-0"><p className="text-xs text-(--text-secondary)">{label}</p><p className="mt-2 font-mono text-lg font-semibold tabular-nums sm:text-2xl">{value}</p></div>)}
    </div> : null}
    <div className="flex items-center justify-between gap-3">
      <h3 className="font-medium">文件分享</h3>
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" disabled={acting || loading} onClick={reload} aria-label="刷新文件记录"><RefreshCw className="size-4" aria-hidden="true" /></Button>
        <Button variant="outline" size="sm" disabled={acting || loading} onClick={() => void cleanup()}>清理失效文件</Button>
      </div>
    </div>
    {error ? <div role="alert" className="flex items-center justify-between gap-3 text-sm text-red-400"><p>{error}</p><Button variant="outline" size="sm" onClick={reload}>重试</Button></div> : null}
    {notice ? <p role="status" className="text-sm text-(--text-secondary)">{notice}</p> : null}
    {loading && !data ? <p role="status" className="py-8 text-center text-sm text-(--text-secondary)">正在加载文件记录…</p> : null}
    {data ? <>
      <div className="overflow-x-auto rounded-lg border border-(--border-subtle)">
        <table className="w-full text-left text-sm"><caption className="sr-only">文件分享与清理状态</caption>
          <thead className="border-b border-(--border-subtle) text-xs text-(--text-secondary)"><tr>
            <th scope="col" className="px-4 py-3 font-medium">文件</th><th scope="col" className="px-3 py-3 font-medium">大小</th><th scope="col" className="px-3 py-3 font-medium">状态</th><th scope="col" className="px-4 py-3 text-right font-medium">操作</th>
          </tr></thead>
          <tbody className="divide-y divide-(--border-subtle)">{data.items.map((item) => <tr key={item.id}>
            <td className="min-w-40 px-4 py-4"><p className="max-w-64 font-medium [overflow-wrap:anywhere]">{item.fileName}</p><p className="mt-1 font-mono text-xs text-(--text-secondary)">{item.id}</p></td>
            <td className="whitespace-nowrap px-3 py-4 text-(--text-secondary)">{formatBytes(item.size)}</td>
            <td className="whitespace-nowrap px-3 py-4 text-(--text-secondary)">{statusLabel(item)}</td>
            <td className="px-4 py-4"><div className="flex justify-end gap-1">
              <Button variant="ghost" size="icon-sm" disabled={loading || acting} aria-label={`查看 ${item.fileName}`} onClick={() => { setActionError(''); setModal({ kind: 'detail', item }) }}><Eye aria-hidden="true" /></Button>
              <Button variant="ghost" size="icon-sm" disabled={loading || acting} aria-label={`删除 ${item.fileName}`} onClick={() => { setActionError(''); setModal({ kind: 'delete', item }) }}><Trash2 className="text-red-400" aria-hidden="true" /></Button>
            </div></td>
          </tr>)}</tbody>
        </table>
        {data.items.length === 0 ? <p className="p-8 text-center text-sm text-(--text-secondary)">暂无文件分享</p> : null}
      </div>
      <Pagination page={data.page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize}
        onPageChange={(value) => { setLoading(true); setError(''); setPage(value) }}
        onPageSizeChange={(value) => { setLoading(true); setError(''); setPageSize(value); setPage(1) }} />
    </> : null}
    <Dialog open={modal !== null} onOpenChange={(open) => { if (!open && !acting) setModal(null) }}>
      <DialogContent className="sm:max-w-md motion-reduce:animate-none">
        <DialogHeader><DialogTitle>{modal?.kind === 'delete' ? '删除这条分享？' : '文件详情'}</DialogTitle><DialogDescription className={modal?.kind === 'delete' ? undefined : 'sr-only'}>{modal?.kind === 'delete' ? '删除后链接失效。' : '文件分享信息'}</DialogDescription></DialogHeader>
        {modal ? <div className="space-y-3 text-sm">
          <p className="font-medium [overflow-wrap:anywhere]">{modal.item.fileName}</p>
          <p className="text-(--text-secondary)">{formatBytes(modal.item.size)} · {statusLabel(modal.item)}</p>
          {modal.kind === 'detail' ? <><p>到期：{new Date(modal.item.expiresAt).toLocaleString('zh-CN')}</p><p>{modal.item.downloadsRemaining === null ? '不限下载次数' : `剩余 ${modal.item.downloadsRemaining} 次下载`}{modal.item.hasPassword ? ' · 密码保护' : ''}</p><a className="text-(--accent-primary) underline underline-offset-4" href={`/f/${encodeURIComponent(modal.item.id)}`}>查看分享页面</a></> : null}
        </div> : null}
        {actionError ? <p role="alert" className="text-sm text-red-400">{actionError}</p> : null}
        {modal?.kind === 'delete' ? <div className="grid grid-cols-2 gap-3"><Button variant="outline" disabled={acting} onClick={() => setModal(null)}>取消</Button><Button variant="destructive" disabled={acting} onClick={() => void remove()}>{acting ? '正在删除…' : '确认删除'}</Button></div> : <Button variant="outline" onClick={() => setModal(null)}>关闭详情</Button>}
      </DialogContent>
    </Dialog>
  </div>
}
