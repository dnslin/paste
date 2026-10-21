'use client'

import { useId, useState, type ReactNode } from 'react'
import { ChevronDown, Settings2 } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

export function formatSettingsSummary(expiresIn: number | null, limit: number | null, hasPassword: boolean, action: '查看' | '下载') {
  const expiry = expiresIn === null ? '永不过期'
    : expiresIn < 60 ? `${expiresIn} 分钟有效`
    : expiresIn < 1440 ? `${expiresIn / 60} 小时有效`
    : `${expiresIn / 1440} 天有效`
  return `${expiry} · ${limit === null ? '不限次数' : `${limit} 次${action}`} · ${hasPassword ? '密码保护' : '无密码'}`
}

export function ShareSettings({ summary, disabled, invalid = false, children }: {
  summary: string
  disabled?: boolean
  invalid?: boolean
  children: ReactNode
}) {
  const [expanded, setExpanded] = useState(false)
  const summaryId = useId()

  return <Collapsible open={expanded || invalid} onOpenChange={(open) => setExpanded(open || invalid)} disabled={disabled}
    className="rounded-xl border border-(--border-subtle) bg-(--bg-surface) p-3 sm:border-0 sm:bg-transparent sm:p-0">
    <CollapsibleTrigger asChild>
      <button type="button" aria-label="分享设置" aria-describedby={summaryId}
        className="group flex min-h-11 w-full items-center gap-3 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-(--accent-primary) disabled:opacity-50 sm:hidden">
        <Settings2 className="size-4 shrink-0 text-(--text-secondary)" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">分享设置</span>
          <span id={summaryId} className="mt-1 block text-xs leading-5 text-(--text-secondary)">{summary}</span>
        </span>
        <ChevronDown className="size-4 shrink-0 text-(--text-secondary) motion-safe:transition-transform group-data-[state=open]:rotate-180" aria-hidden="true" />
      </button>
    </CollapsibleTrigger>
    <CollapsibleContent forceMount className="hidden pt-4 data-[state=open]:block sm:block sm:pt-0">
      {children}
    </CollapsibleContent>
  </Collapsible>
}
