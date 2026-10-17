'use client'

import { useState } from 'react'
import { Eye, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatBytes, itemName, type PrototypeShare } from './model'

interface Row { id: string; name: string; kind: 'file' | 'text'; bytes: number; status: 'active' | 'expired'; content?: string }

export function AdminPreview({ share, onDeleteCurrent, currentExhausted = false }: { share: PrototypeShare; onDeleteCurrent: () => void; currentExhausted?: boolean }) {
  const [rows, setRows] = useState<Row[]>(() => [
    { id: 'demo-current', name: itemName(share.item), kind: share.item.kind, bytes: share.item.kind === 'file' ? share.item.file.size : new TextEncoder().encode(share.item.content).length, status: 'active', content: share.item.kind === 'text' ? share.item.content : undefined },
    { id: 'demo-notes', name: '部署注意事项', kind: 'text', bytes: 128, status: 'active', content: '部署前请检查环境变量，升级前备份数据库、文件和加密密钥。' },
    { id: 'demo-archive', name: '上一版设计交付.zip', kind: 'file', bytes: 2.4 * 1024 * 1024, status: 'expired' },
  ])
  const [filter, setFilter] = useState('all')
  const [modal, setModal] = useState<{ kind: 'detail' | 'delete'; row: Row } | null>(null)
  const [notice, setNotice] = useState('')
  const visibleRows = rows.filter((row) => filter === 'all' || row.kind === filter)
  const files = rows.filter((row) => row.kind === 'file')
  const usedBytes = files.reduce((total, row) => total + row.bytes, 0)
  function statusLabel(row: Row) {
    return row.id === 'demo-current' && currentExhausted ? '次数用尽' : row.status === 'active' ? '可访问' : '已过期，等待清理'
  }

  return <div className="space-y-6">
    <h1 className="text-2xl font-bold tracking-tight">分享管理</h1>
    <div className="grid grid-cols-3 gap-4 border-y border-(--border-subtle) py-5">
      {[
        { label: '分享总数', value: rows.length },
        { label: '文件数量', value: files.length },
        { label: '文件占用', value: formatBytes(usedBytes) },
      ].map(({ label, value }) => <div key={label} className="min-w-0">
        <p className="text-xs text-(--text-secondary)">{label}</p>
        <p className="mt-2 font-mono text-lg font-semibold tabular-nums sm:text-2xl">{value}</p>
      </div>)}
    </div>
    <div className="overflow-hidden rounded-lg border border-(--border-subtle) bg-(--bg-surface)">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-(--border-subtle) p-4"><h2 className="font-semibold">全部分享</h2>
        <Select value={filter} onValueChange={setFilter}><SelectTrigger aria-label="按分享类型筛选" className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent className="animate-none!"><SelectItem value="all">全部类型</SelectItem><SelectItem value="file">仅文件</SelectItem><SelectItem value="text">仅文本</SelectItem></SelectContent>
        </Select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm"><caption className="sr-only">分享记录与管理操作</caption>
          <thead className="border-b border-(--border-subtle) text-xs text-(--text-secondary)"><tr><th scope="col" className="px-4 py-3 font-medium">分享内容</th><th scope="col" className="px-3 py-3 font-medium">类型 / 大小</th><th scope="col" className="px-3 py-3 font-medium">状态</th><th scope="col" className="px-4 py-3 text-right font-medium">操作</th></tr></thead>
          <tbody className="divide-y divide-(--border-subtle)">{visibleRows.map((row) => <tr key={row.id}>
            <td className="min-w-40 px-4 py-4"><p className="max-w-60 font-medium [overflow-wrap:anywhere]">{row.name}</p><p className="mt-1 font-mono text-xs text-(--text-secondary)">{row.id}</p></td>
            <td className="whitespace-nowrap px-3 py-4 text-(--text-secondary)">{row.kind === 'file' ? formatBytes(row.bytes) : '文本'}</td>
            <td className="whitespace-nowrap px-3 py-4"><span className={statusLabel(row) === '可访问' ? 'text-emerald-400' : 'text-(--text-secondary)'}>{statusLabel(row)}</span></td>
            <td className="px-4 py-4"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon-sm" aria-label={`查看 ${row.name}`} onClick={() => setModal({ kind: 'detail', row })}><Eye aria-hidden="true" /></Button><Button variant="ghost" size="icon-sm" aria-label={`删除 ${row.name}`} onClick={() => setModal({ kind: 'delete', row })}><Trash2 className="text-red-400" aria-hidden="true" /></Button></div></td>
          </tr>)}</tbody>
        </table>
        {visibleRows.length === 0 ? <p role="status" className="p-8 text-center text-sm text-(--text-secondary)">没有对应类型的分享。</p> : null}
      </div>
      <p className="border-t border-(--border-subtle) px-4 py-3 text-xs text-(--text-secondary)">当前 {visibleRows.length} 条，共 {rows.length} 条分享</p>
    </div>
    {notice ? <p role="status" className="text-sm text-(--accent-primary)">{notice}</p> : null}
    <Dialog open={modal !== null} onOpenChange={(open) => { if (!open) setModal(null) }}>
      <DialogContent showCloseButton={false} className="sm:max-w-md motion-reduce:animate-none">
        <DialogHeader><DialogTitle>{modal?.kind === 'delete' ? '删除这条分享？' : '分享详情'}</DialogTitle><DialogDescription className={modal?.kind === 'delete' ? undefined : 'sr-only'}>{modal?.kind === 'delete' ? '删除后无法恢复。' : '分享信息'}</DialogDescription></DialogHeader>
        {modal ? <div className="space-y-3 text-sm"><p className="font-medium [overflow-wrap:anywhere]">{modal.row.name}</p><p className="text-(--text-secondary)">{modal.row.kind === 'file' ? `文件 · ${formatBytes(modal.row.bytes)}` : '文本分享'} · {statusLabel(modal.row)}</p>
          {modal.kind === 'detail' && modal.row.content ? <pre className="max-h-60 overflow-auto whitespace-pre-wrap rounded-lg border border-(--border-subtle) p-3 text-sm">{modal.row.content}</pre> : null}
        </div> : null}
        {modal?.kind === 'delete' ? <div className="grid grid-cols-2 gap-3"><Button variant="outline" onClick={() => setModal(null)}>取消</Button><Button variant="destructive" onClick={() => { setRows((current) => current.filter((row) => row.id !== modal.row.id)); if (modal.row.id === 'demo-current') onDeleteCurrent(); setNotice(`已从演示记录中删除 ${modal.row.name}`); setModal(null) }}>确认删除</Button></div> : <Button variant="outline" onClick={() => setModal(null)}>关闭详情</Button>}
        <DialogClose asChild><Button variant="ghost" size="icon" className="absolute right-2 top-2" aria-label="关闭管理弹窗"><X aria-hidden="true" /></Button></DialogClose>
      </DialogContent>
    </Dialog>
  </div>
}
