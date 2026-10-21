'use client'

import { useRef, useState } from 'react'
import { Eye, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatBytes } from '@/components/file-share/presentation'
import { STATUS_LABELS } from './demo-data'
import type { DemoRecord, RecordKind } from './demo-data'

function createdLabel(value: string) {
  return new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(value))
}

function RecordStatus({ item }: { item: DemoRecord }) {
  const color = item.status === 'active' ? 'text-green-400 bg-green-500/10' : item.status === 'delete_failed' ? 'text-red-400 bg-red-500/10' : 'text-(--text-secondary) bg-(--bg-elevated)'
  return <span className={`inline-block rounded px-2 py-1 text-xs ${color}`}>{STATUS_LABELS[item.status]}</span>
}

export function RecordsResults({ kind, items }: { kind: RecordKind; items: DemoRecord[] }) {
  const [selected, setSelected] = useState<DemoRecord | null>(null)
  const detailTrigger = useRef<HTMLButtonElement | null>(null)

  return <>
    <div className="overflow-hidden rounded-lg border border-(--border-subtle) bg-(--bg-surface)">
      <table className="w-full table-fixed text-left text-sm md:table-auto">
        <caption className="sr-only">{kind === 'file' ? '文件分享查询结果' : '文本分享查询结果'}</caption>
        <thead className="border-b border-(--border-subtle) text-xs text-(--text-secondary)"><tr>
          <th scope="col" className="px-4 py-3 font-medium">{kind === 'file' ? '文件 / ID' : '分享 ID'}</th>
          <th scope="col" className="hidden px-4 py-3 font-medium md:table-cell">{kind === 'file' ? '大小' : '语言'}</th>
          <th scope="col" className="hidden px-4 py-3 font-medium md:table-cell">状态</th>
          <th scope="col" className="hidden px-4 py-3 font-medium md:table-cell">创建时间 <span className="font-normal">(北京时间)</span></th>
          <th scope="col" className="w-16 px-3 py-3 text-right font-medium">操作</th>
        </tr></thead>
        <tbody className="divide-y divide-(--border-subtle)">{items.map(item => <tr key={item.id} className="hover:bg-(--bg-elevated)/40">
          <td className="px-4 py-4 md:max-w-80">
            {kind === 'file' ? <p className="mb-1 font-medium [overflow-wrap:anywhere]">{item.fileName}</p> : null}
            <p className={`flex items-center gap-2 ${kind === 'file' ? 'text-xs text-(--text-secondary)' : ''}`}><span className="font-mono [overflow-wrap:anywhere]">{item.id}</span>{item.hasPassword ? <Lock className="size-3 shrink-0 text-(--text-secondary)" aria-label="密码保护" /> : null}</p>
            <div className="mt-2 space-y-2 text-xs text-(--text-secondary) md:hidden"><p>{kind === 'file' ? formatBytes(item.size ?? 0) : item.language} · {createdLabel(item.createdAt)}</p><RecordStatus item={item} /></div>
          </td>
          <td className="hidden whitespace-nowrap px-4 py-4 text-(--text-secondary) md:table-cell">{kind === 'file' ? formatBytes(item.size ?? 0) : item.language}</td>
          <td className="hidden whitespace-nowrap px-4 py-4 md:table-cell"><RecordStatus item={item} /></td>
          <td className="hidden whitespace-nowrap px-4 py-4 font-mono text-xs text-(--text-secondary) md:table-cell">{createdLabel(item.createdAt)}</td>
          <td className="px-2 py-4 text-right"><Button variant="ghost" size="icon" className="size-11 motion-reduce:transition-none" aria-label={`查看 ${item.fileName ?? item.id}`} onClick={event => { detailTrigger.current = event.currentTarget; setSelected(item) }}><Eye className="size-4" aria-hidden="true" /></Button></td>
        </tr>)}</tbody>
      </table>
    </div>
    <Dialog open={selected !== null} onOpenChange={open => { if (!open) setSelected(null) }}>
      <DialogContent onCloseAutoFocus={event => { event.preventDefault(); detailTrigger.current?.focus() }} className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md motion-reduce:animate-none">
        <DialogHeader><DialogTitle>分享详情</DialogTitle><DialogDescription>演示记录的元信息</DialogDescription></DialogHeader>
        {selected ? <dl className="space-y-4 text-sm">
          {selected.fileName ? <div><dt className="text-xs text-(--text-secondary)">文件名</dt><dd className="mt-1 [overflow-wrap:anywhere]">{selected.fileName}</dd></div> : null}
          <div><dt className="text-xs text-(--text-secondary)">分享 ID</dt><dd className="mt-1 break-all font-mono">{selected.id}</dd></div>
          <div><dt className="text-xs text-(--text-secondary)">状态</dt><dd className="mt-1"><RecordStatus item={selected} /></dd></div>
          <div><dt className="text-xs text-(--text-secondary)">创建时间（北京时间）</dt><dd className="mt-1">{createdLabel(selected.createdAt)}</dd></div>
          <div><dt className="text-xs text-(--text-secondary)">密码保护</dt><dd className="mt-1">{selected.hasPassword ? '已开启' : '未开启'}</dd></div>
        </dl> : null}
      </DialogContent>
    </Dialog>
  </>
}
