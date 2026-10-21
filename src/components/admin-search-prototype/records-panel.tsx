'use client'

import { useId, useState } from 'react'
import { Search, X, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Pagination } from '@/components/admin/pagination'
import { DEMO_RECORDS, EMPTY_FILTERS, STATUS_LABELS, STATUS_OPTIONS, filterRecords } from './demo-data'
import type { RecordFilters, RecordKind, RecordStatus } from './demo-data'
import type { DemoScenario } from './admin-search-prototype'
import { RecordsResults } from './records-results'

const fieldClass = 'h-11 w-full min-w-0 rounded-md border border-(--border-default) bg-(--bg-base) px-3 text-sm text-(--text-primary) outline-none focus-visible:border-(--accent-primary) focus-visible:ring-2 focus-visible:ring-(--accent-glow) disabled:opacity-50 [color-scheme:dark]'

export function RecordsPanel({ kind, scenario, onRetry }: { kind: RecordKind; scenario: DemoScenario; onRetry: () => void }) {
  const id = useId()
  const [draft, setDraft] = useState<RecordFilters>({ ...EMPTY_FILTERS })
  const [applied, setApplied] = useState<RecordFilters>({ ...EMPTY_FILTERS })
  const [dateError, setDateError] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)
  const loading = scenario === 'loading'
  const results = filterRecords(DEMO_RECORDS, kind, applied)
  const totalPages = Math.max(1, Math.ceil(results.length / pageSize))
  const hasFilters = Object.values(applied).some(Boolean)
  const filtersChanged = (Object.keys(draft) as (keyof RecordFilters)[]).some(key => draft[key] !== applied[key])

  function update(key: keyof RecordFilters, value: string) {
    setDraft(current => ({ ...current, [key]: value }))
    setDateError('')
  }
  function reset() {
    setDraft({ ...EMPTY_FILTERS }); setApplied({ ...EMPTY_FILTERS }); setPage(1); setDateError('')
  }

  return <div className="space-y-4">
    <form role="search" aria-label={kind === 'file' ? '搜索文件分享' : '搜索文本分享'} noValidate onSubmit={(event) => {
      event.preventDefault()
      if (draft.from && draft.to && draft.from > draft.to) { setDateError('开始日期不能晚于结束日期'); return }
      const next = { ...draft, q: draft.q.trim() }
      setDraft(next); setApplied(next); setPage(1); setDateError('')
    }} className="rounded-lg border border-(--border-subtle) bg-(--bg-surface) p-4">
      <fieldset disabled={loading} className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(180px,1.5fr)_minmax(140px,1fr)_minmax(145px,1fr)_minmax(145px,1fr)_auto]">
        <legend className="sr-only">筛选分享记录</legend>
        <div className="min-w-0 space-y-2"><label htmlFor={`${id}-q`} className="block text-xs text-(--text-secondary)">{kind === 'file' ? 'ID / 文件名' : '分享 ID'}</label><div className="relative"><Search className="pointer-events-none absolute top-3.5 left-3 size-4 text-(--text-muted)" aria-hidden="true" /><input id={`${id}-q`} type="search" value={draft.q} onChange={event => update('q', event.target.value)} placeholder={kind === 'file' ? 'ID 片段或文件名关键词' : '输入 ID 片段，区分大小写'} className={`${fieldClass} pl-9`} /></div></div>
        <div className="min-w-0 space-y-2"><label htmlFor={`${id}-status`} className="block text-xs text-(--text-secondary)">状态</label><select id={`${id}-status`} value={draft.status} onChange={event => update('status', event.target.value)} className={fieldClass}><option value="">全部状态</option>{STATUS_OPTIONS[kind].map(status => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}</select></div>
        <div className="min-w-0 space-y-2"><label htmlFor={`${id}-from`} className="block text-xs text-(--text-secondary)">创建开始日期</label><input id={`${id}-from`} type="date" value={draft.from} onChange={event => update('from', event.target.value)} aria-invalid={Boolean(dateError)} aria-describedby={dateError ? `${id}-error` : `${id}-date-hint`} className={fieldClass} /></div>
        <div className="min-w-0 space-y-2"><label htmlFor={`${id}-to`} className="block text-xs text-(--text-secondary)">创建结束日期</label><input id={`${id}-to`} type="date" value={draft.to} onChange={event => update('to', event.target.value)} aria-invalid={Boolean(dateError)} aria-describedby={dateError ? `${id}-error` : `${id}-date-hint`} className={fieldClass} /></div>
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-1"><Button type="submit" className="h-11 flex-1 motion-reduce:transition-none lg:flex-none">查询</Button><Button type="button" variant="outline" onClick={reset} className="h-11 flex-1 motion-reduce:transition-none lg:flex-none">重置</Button></div>
      </fieldset>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-(--text-secondary)"><p id={`${id}-date-hint`}>创建日期按北京时间，包含起止当天</p>{filtersChanged ? <p>条件已修改，点击查询后生效</p> : null}</div>
      {dateError ? <p id={`${id}-error`} role="alert" className="mt-3 text-sm text-red-400">{dateError}</p> : null}
    </form>
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
      <p role="status" aria-live="polite" className="font-medium">{scenario === 'normal' ? `找到 ${results.length} 条` : scenario === 'empty' ? '共 0 条' : loading ? '正在加载记录…' : '查询未完成'}</p>
      <p className="text-xs text-(--text-secondary)">按创建时间倒序</p>
    </div>
    {hasFilters ? <div className="flex flex-wrap items-center gap-2 text-xs text-(--text-secondary)" aria-label="当前生效条件">
      <span>当前条件</span>
      {[applied.q ? `关键词：${applied.q}` : '', applied.status ? `状态：${STATUS_LABELS[applied.status as RecordStatus]}` : '', applied.from || applied.to ? `创建：${applied.from || '不限'} 至 ${applied.to || '不限'}` : ''].filter(Boolean).map(label => <span key={label} className="max-w-full rounded border border-(--border-subtle) bg-(--bg-surface) px-2 py-1 [overflow-wrap:anywhere]">{label}</span>)}
      <button disabled={loading} type="button" onClick={reset} className="flex min-h-9 items-center gap-1 rounded px-1 text-(--accent-primary) outline-none focus-visible:ring-2 focus-visible:ring-(--accent-primary) disabled:opacity-50" aria-label="清空当前筛选条件"><X className="size-3" aria-hidden="true" />清空</button>
    </div> : null}
    {scenario === 'error' ? <div role="alert" className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-(--border-subtle) bg-(--bg-surface) p-6"><p className="flex items-center gap-2 text-sm"><AlertCircle className="size-4 text-red-400" aria-hidden="true" />记录加载失败，请重试。</p><Button variant="outline" onClick={onRetry}>重试</Button></div>
      : loading ? <div aria-busy="true" aria-label="记录加载中" className="space-y-4 rounded-lg border border-(--border-subtle) p-5">{[1, 2, 3].map(value => <div key={value} className="h-12 rounded bg-(--bg-elevated) motion-safe:animate-pulse" />)}</div>
        : scenario === 'empty' || results.length === 0 ? <div className="space-y-3 rounded-lg border border-(--border-subtle) bg-(--bg-surface) px-4 py-12 text-center"><Search className="mx-auto size-6 text-(--text-muted)" aria-hidden="true" /><h3 className="text-sm font-medium">{scenario === 'empty' ? '暂无分享记录' : '没有匹配的分享'}</h3><p className="text-sm text-(--text-secondary)">{scenario === 'empty' ? '创建分享后，记录会显示在这里。' : '试试其他关键词、状态或日期范围。'}</p>{scenario !== 'empty' ? <Button variant="outline" onClick={reset}>清空筛选</Button> : null}</div>
          : <><RecordsResults kind={kind} items={results.slice((page - 1) * pageSize, page * pageSize)} /><Pagination page={page} totalPages={totalPages} total={results.length} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={value => { setPageSize(value); setPage(1) }} /></>}
    {kind === 'file' ? <p className="text-xs leading-5 text-(--text-secondary)">已成功清理或删除的文件不再保留记录。文件占用为全部文件的用量。</p> : null}
  </div>
}
