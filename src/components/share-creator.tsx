'use client'

import { useState } from 'react'
import { Tabs } from 'radix-ui'
import { PasteCreator } from '@/components/paste/paste-creator'
import { FileCreator } from '@/components/file-share/file-creator'

export function ShareCreator() {
  const [mode, setMode] = useState('text')
  const [busy, setBusy] = useState(false)

  return <Tabs.Root value={mode} onValueChange={setMode}>
    <Tabs.List aria-label="分享类型" className="mb-5 flex gap-6 border-b border-(--border-subtle)">
      {([['text', '文本 / 代码'], ['file', '文件']] as const).map(([value, label]) => <Tabs.Trigger key={value} value={value} disabled={busy}
        className="h-11 border-b-2 border-transparent px-1 text-sm text-(--text-secondary) outline-none hover:text-(--text-primary) focus-visible:ring-2 focus-visible:ring-(--accent-primary) disabled:opacity-50 data-[state=active]:border-(--accent-primary) data-[state=active]:text-(--text-primary)">{label}</Tabs.Trigger>)}
    </Tabs.List>
    <Tabs.Content value="text" forceMount hidden={mode !== 'text'} className="outline-none"><PasteCreator onBusyChange={setBusy} /></Tabs.Content>
    <Tabs.Content value="file" forceMount hidden={mode !== 'file'} className="outline-none"><FileCreator onBusyChange={setBusy} /></Tabs.Content>
  </Tabs.Root>
}
