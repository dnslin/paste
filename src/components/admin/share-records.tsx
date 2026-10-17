'use client'

import { Tabs } from 'radix-ui'
import { useState } from 'react'
import { PastesTable } from './pastes-table'
import { FilesTable } from './files-table'

export function ShareRecords() {
  const [tab, setTab] = useState('text')
  const [filesVisited, setFilesVisited] = useState(false)

  return <Tabs.Root value={tab} onValueChange={(value) => {
    setTab(value)
    if (value === 'file') setFilesVisited(true)
  }} className="space-y-5">
    <Tabs.List aria-label="分享记录类型" className="flex gap-6 border-b border-(--border-subtle)">
      {([['text', '文本 / 代码'], ['file', '文件']] as const).map(([value, label]) => <Tabs.Trigger
        key={value} value={value}
        className="border-b-2 border-transparent px-1 py-3 text-sm text-(--text-secondary) outline-none hover:text-(--text-primary) focus-visible:ring-2 focus-visible:ring-(--accent-primary) data-[state=active]:border-(--accent-primary) data-[state=active]:text-(--text-primary)"
      >{label}</Tabs.Trigger>)}
    </Tabs.List>
    <Tabs.Content value="text" forceMount hidden={tab !== 'text'} className="outline-none"><PastesTable /></Tabs.Content>
    <Tabs.Content value="file" forceMount hidden={tab !== 'file'} className="outline-none">{filesVisited ? <FilesTable /> : null}</Tabs.Content>
  </Tabs.Root>
}
