'use client'

import { useId, useState } from 'react'
import { Search, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Pagination } from '@/components/admin/pagination'
import { EMPTY_RECORD_FILTERS, RecordFilters, type RecordFilterValues } from '@/components/admin/record-filters'
import { DEMO_RECORDS, filterRecords } from './demo-data'
import type { RecordKind } from './demo-data'
import type { DemoScenario } from './admin-search-prototype'
import { RecordsResults } from './records-results'

export function RecordsPanel({ kind, scenario, onRetry }: { kind: RecordKind; scenario: DemoScenario; onRetry: () => void }) {
  const filterFormId = useId()
  const [applied, setApplied] = useState<RecordFilterValues>({ ...EMPTY_RECORD_FILTERS })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)
  const loading = scenario === 'loading'
  const results = filterRecords(DEMO_RECORDS, kind, applied)
  const totalPages = Math.max(1, Math.ceil(results.length / pageSize))

  return <div className="space-y-4">
    <RecordFilters id={filterFormId} kind={kind} value={applied} disabled={loading}
      onApply={filters => { setApplied(filters); setPage(1) }} />
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
      <p role="status" aria-live="polite" className="font-medium">{scenario === 'normal' ? `找到 ${results.length} 条` : scenario === 'empty' ? '共 0 条' : loading ? '正在加载记录…' : '查询未完成'}</p>
      <p className="text-xs text-(--text-secondary)">按创建时间倒序</p>
    </div>
    {scenario === 'error' ? <div role="alert" className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-(--border-subtle) bg-(--bg-surface) p-6"><p className="flex items-center gap-2 text-sm"><AlertCircle className="size-4 text-red-400" aria-hidden="true" />记录加载失败，请重试。</p><Button variant="outline" onClick={onRetry}>重试</Button></div>
      : loading ? <div aria-busy="true" aria-label="记录加载中" className="space-y-4 rounded-lg border border-(--border-subtle) p-5">{[1, 2, 3].map(value => <div key={value} className="h-12 rounded bg-(--bg-elevated) motion-safe:animate-pulse" />)}</div>
        : scenario === 'empty' || results.length === 0 ? <div className="space-y-3 rounded-lg border border-(--border-subtle) bg-(--bg-surface) px-4 py-12 text-center"><Search className="mx-auto size-6 text-(--text-muted)" aria-hidden="true" /><h3 className="text-sm font-medium">{scenario === 'empty' ? '暂无分享记录' : '没有匹配的分享'}</h3><p className="text-sm text-(--text-secondary)">{scenario === 'empty' ? '创建分享后，记录会显示在这里。' : '试试其他关键词、状态或日期范围。'}</p>{scenario !== 'empty' ? <Button type="reset" form={filterFormId} variant="outline">清空筛选</Button> : null}</div>
          : <><RecordsResults kind={kind} items={results.slice((page - 1) * pageSize, page * pageSize)} /><Pagination page={page} totalPages={totalPages} total={results.length} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={value => { setPageSize(value); setPage(1) }} /></>}
    {kind === 'file' ? <p className="text-xs leading-5 text-(--text-secondary)">已成功清理或删除的文件不再保留记录。文件占用为全部文件的用量。</p> : null}
  </div>
}
