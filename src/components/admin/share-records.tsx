'use client'

import { Tabs } from 'radix-ui'
import { PastesTable } from './pastes-table'
import { FilesTable } from './files-table'

export function ShareRecords() {
  return <Tabs.Root defaultValue="text" className="space-y-5">
    <Tabs.List aria-label="分享记录类型" className="flex gap-6 border-b border-(--border-subtle)">
      {([['text', '文本 / 代码'], ['file', '文件']] as const).map(([value, label]) => <Tabs.Trigger
        key={value} value={value}
        className="border-b-2 border-transparent px-1 py-3 text-sm text-(--text-secondary) outline-none hover:text-(--text-primary) focus-visible:ring-2 focus-visible:ring-(--accent-primary) data-[state=active]:border-(--accent-primary) data-[state=active]:text-(--text-primary)"
      >{label}</Tabs.Trigger>)}
    </Tabs.List>
    <Tabs.Content value="text" className="outline-none"><PastesTable /></Tabs.Content>
    <Tabs.Content value="file" className="outline-none"><FilesTable /></Tabs.Content>
  </Tabs.Root>
}
