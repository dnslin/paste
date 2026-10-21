'use client'

import { useId, useState } from 'react'
import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface RecordFilterValues {
  q: string
  status: string
  from: string
  to: string
}

export const EMPTY_RECORD_FILTERS: RecordFilterValues = { q: '', status: '', from: '', to: '' }

const STATUS_LABELS: Record<string, string> = {
  active: '可访问', expired: '已过期', destroyed: '查看次数用尽', exhausted: '下载次数用尽',
  pending_delete: '等待清理', delete_failed: '清理失败',
}
const STATUS_OPTIONS = {
  text: ['active', 'expired', 'destroyed'],
  file: ['active', 'expired', 'exhausted', 'pending_delete', 'delete_failed'],
}
const fieldClass = 'h-11 w-full min-w-0 rounded-md border border-(--border-default) bg-(--bg-base) px-3 text-sm text-(--text-primary) outline-none focus-visible:border-(--accent-primary) focus-visible:ring-2 focus-visible:ring-(--accent-glow) disabled:opacity-50 [color-scheme:dark]'

export function hasRecordFilters(filters: RecordFilterValues) {
  return Boolean(filters.q || filters.status || filters.from || filters.to)
}

export function recordFilterParams(filters: RecordFilterValues) {
  const params = new URLSearchParams()
  if (filters.q) params.set('q', filters.q)
  if (filters.status) params.set('status', filters.status)
  if (filters.from) params.set('createdFrom', new Date(`${filters.from}T00:00:00+08:00`).toISOString())
  if (filters.to) params.set('createdBefore', new Date(new Date(`${filters.to}T00:00:00+08:00`).getTime() + 86400000).toISOString())
  return params
}

export function formatRecordCreatedAt(value: string) {
  return new Date(value).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
}

export function RecordFilters({ id: formId, kind, value, disabled, onApply }: {
  id?: string
  kind: 'text' | 'file'
  value: RecordFilterValues
  disabled: boolean
  onApply: (filters: RecordFilterValues) => void
}) {
  const id = useId()
  const [draft, setDraft] = useState(() => ({ ...value }))
  const [dateError, setDateError] = useState('')
  const changed = (Object.keys(draft) as (keyof RecordFilterValues)[]).some(key => draft[key] !== value[key])
  function update(key: keyof RecordFilterValues, next: string) {
    setDraft(current => ({ ...current, [key]: next }))
    setDateError('')
  }
  function reset() {
    const next = { ...EMPTY_RECORD_FILTERS }
    setDraft(next); setDateError(''); onApply(next)
  }

  return <div className="space-y-3">
    <form id={formId} role="search" aria-label={kind === 'file' ? '搜索文件分享' : '搜索文本分享'} noValidate onReset={event => { event.preventDefault(); reset() }} onSubmit={event => {
      event.preventDefault()
      if (draft.from && draft.to && draft.from > draft.to) { setDateError('开始日期不能晚于结束日期'); return }
      const next = { ...draft, q: draft.q.trim() }
      setDraft(next); setDateError(''); onApply(next)
    }} className="rounded-lg border border-(--border-subtle) bg-(--bg-surface) p-4">
      <fieldset disabled={disabled} className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(180px,1.5fr)_minmax(140px,1fr)_minmax(145px,1fr)_minmax(145px,1fr)_auto]">
        <legend className="sr-only">筛选分享记录</legend>
        <div className="min-w-0 space-y-2"><label htmlFor={`${id}-q`} className="block text-xs text-(--text-secondary)">{kind === 'file' ? 'ID / 文件名' : '分享 ID'}</label><div className="relative"><Search className="pointer-events-none absolute top-3.5 left-3 size-4 text-(--text-muted)" aria-hidden="true" /><input id={`${id}-q`} type="search" value={draft.q} onChange={event => update('q', event.target.value)} placeholder={kind === 'file' ? 'ID 片段或文件名关键词' : '输入 ID 片段，区分大小写'} className={`${fieldClass} pl-9`} /></div></div>
        <div className="min-w-0 space-y-2"><label htmlFor={`${id}-status`} className="block text-xs text-(--text-secondary)">状态</label><select id={`${id}-status`} value={draft.status} onChange={event => update('status', event.target.value)} className={fieldClass}><option value="">全部状态</option>{STATUS_OPTIONS[kind].map(status => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}</select></div>
        <div className="min-w-0 space-y-2"><label htmlFor={`${id}-from`} className="block text-xs text-(--text-secondary)">创建开始日期</label><input id={`${id}-from`} type="date" value={draft.from} onChange={event => update('from', event.target.value)} aria-invalid={Boolean(dateError)} aria-describedby={dateError ? `${id}-error` : `${id}-date-hint`} className={fieldClass} /></div>
        <div className="min-w-0 space-y-2"><label htmlFor={`${id}-to`} className="block text-xs text-(--text-secondary)">创建结束日期</label><input id={`${id}-to`} type="date" value={draft.to} onChange={event => update('to', event.target.value)} aria-invalid={Boolean(dateError)} aria-describedby={dateError ? `${id}-error` : `${id}-date-hint`} className={fieldClass} /></div>
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-1"><Button type="submit" className="h-11 flex-1 motion-reduce:transition-none lg:flex-none">查询</Button><Button type="reset" variant="outline" className="h-11 flex-1 motion-reduce:transition-none lg:flex-none">重置</Button></div>
      </fieldset>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-(--text-secondary)"><p id={`${id}-date-hint`}>创建日期按北京时间，包含起止当天</p>{changed ? <p>条件已修改，点击查询后生效</p> : null}</div>
      {dateError ? <p id={`${id}-error`} role="alert" className="mt-3 text-sm text-red-400">{dateError}</p> : null}
    </form>
    {hasRecordFilters(value) ? <div className="flex flex-wrap items-center gap-2 text-xs text-(--text-secondary)" aria-label="当前生效条件">
      <span>当前条件</span>
      {[value.q ? `关键词：${value.q}` : '', value.status ? `状态：${STATUS_LABELS[value.status]}` : '', value.from || value.to ? `创建：${value.from || '不限'} 至 ${value.to || '不限'}` : ''].filter(Boolean).map(label => <span key={label} className="max-w-full rounded border border-(--border-subtle) bg-(--bg-surface) px-2 py-1 [overflow-wrap:anywhere]">{label}</span>)}
      <button disabled={disabled} type="button" onClick={reset} className="flex min-h-9 items-center gap-1 rounded px-1 text-(--accent-primary) outline-none focus-visible:ring-2 focus-visible:ring-(--accent-primary) disabled:opacity-50" aria-label="清空当前筛选条件"><X className="size-3" aria-hidden="true" />清空</button>
    </div> : null}
  </div>
}
