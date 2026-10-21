'use client'

import Image from 'next/image'
import { useState } from 'react'
import { Tabs } from 'radix-ui'
import { LayoutDashboard } from 'lucide-react'
import { formatBytes } from '@/components/file-share/presentation'
import { RecordsPanel } from './records-panel'
import { DEMO_RECORDS } from './demo-data'

export type DemoScenario = 'normal' | 'loading' | 'error' | 'empty'

export function AdminSearchPrototype() {
  const [tab, setTab] = useState('text')
  const [scenario, setScenario] = useState<DemoScenario>('normal')

  return <div className="min-h-screen bg-(--bg-base)">
    <aside aria-label="原型演示工具" className="border-b border-(--border-default) bg-(--bg-elevated)">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs sm:px-6 lg:px-8">
        <p className="text-(--text-secondary)"><span className="mr-3 font-medium text-(--accent-primary)">交互原型</span>后台搜索与筛选 · 仅演示数据</p>
        <label className="flex items-center gap-2 text-(--text-secondary)">演示状态
          <select value={scenario} onChange={(event) => setScenario(event.target.value as DemoScenario)} className="min-h-9 rounded-md border border-(--border-default) bg-(--bg-base) px-2 text-(--text-primary) outline-none focus-visible:ring-2 focus-visible:ring-(--accent-primary)">
            <option value="normal">正常结果</option><option value="loading">加载中</option><option value="error">加载失败</option><option value="empty">暂无记录</option>
          </select>
        </label>
      </div>
    </aside>
    <header className="h-16 border-b border-(--border-subtle) bg-(--bg-surface)">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3"><Image src="/logo.svg" width={32} height={32} alt="Paste 标志" /><span className="text-lg font-semibold text-(--accent-primary)">Paste 管理后台</span></div>
        <span className="hidden items-center gap-2 text-sm text-(--text-secondary) sm:flex"><LayoutDashboard className="size-4" aria-hidden="true" />概览</span>
      </div>
    </header>
    <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-semibold">概览</h1>
      <div className="grid grid-cols-3 gap-3 sm:gap-5">
        {[
          ['文本分享', `${DEMO_RECORDS.filter(item => item.kind === 'text').length}`],
          ['文件分享', `${DEMO_RECORDS.filter(item => item.kind === 'file').length}`],
          ['文件占用', formatBytes(DEMO_RECORDS.reduce((total, item) => total + (item.size ?? 0), 0))],
        ].map(([label, value]) => <div key={label} className="min-w-0 rounded-lg border border-(--border-subtle) bg-(--bg-surface) p-3 sm:p-5"><p className="text-xs text-(--text-secondary) sm:text-sm">{label}</p><p className="mt-2 break-words font-mono text-lg font-semibold tabular-nums sm:text-2xl">{value}</p></div>)}
      </div>
      <section aria-labelledby="records-heading" className="space-y-4">
        <h2 id="records-heading" className="text-lg font-medium">分享记录</h2>
        <Tabs.Root value={tab} onValueChange={setTab} className="space-y-5">
          <Tabs.List aria-label="分享记录类型" className="flex gap-6 border-b border-(--border-subtle)">
            {([['text', '文本 / 代码'], ['file', '文件']] as const).map(([value, label]) => <Tabs.Trigger key={value} value={value} className="min-h-11 border-b-2 border-transparent px-1 py-3 text-sm text-(--text-secondary) outline-none hover:text-(--text-primary) focus-visible:ring-2 focus-visible:ring-(--accent-primary) data-[state=active]:border-(--accent-primary) data-[state=active]:text-(--text-primary)">{label}</Tabs.Trigger>)}
          </Tabs.List>
          {(['text', 'file'] as const).map(kind => <Tabs.Content key={kind} value={kind} forceMount hidden={tab !== kind} className="outline-none"><RecordsPanel kind={kind} scenario={scenario} onRetry={() => setScenario('normal')} /></Tabs.Content>)}
        </Tabs.Root>
      </section>
    </main>
  </div>
}
