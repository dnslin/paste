'use client'

import { useCallback, useState, useSyncExternalStore } from 'react'
import { Tabs } from 'radix-ui'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ShareCreator } from './share-creator'
import { ShareCreatedDialog } from './share-created-dialog'
import { ShareReceiver, type ReceiverScenario } from './share-receiver'
import { AdminPreview } from './admin-preview'
import { exampleFile, type PrototypeShare } from './model'

type Screen = 'create' | 'receive' | 'manage'
function getScreen(): Screen {
  const hash = window.location.hash
  return hash === '#receive' ? 'receive' : hash === '#manage' ? 'manage' : 'create'
}
function subscribe(listener: () => void) {
  window.addEventListener('hashchange', listener)
  return () => window.removeEventListener('hashchange', listener)
}
function navigate(screen: string) { window.location.hash = screen }
const serverScreen = (): Screen => 'create'

export function FileSharingPrototype() {
  const screen = useSyncExternalStore(subscribe, getScreen, serverScreen)
  const [share, setShare] = useState<PrototypeShare>(() => ({ item: { kind: 'file', file: exampleFile() }, options: { password: '', expiresIn: 1440, limit: 3 } }))
  const [generation, setGeneration] = useState(0)
  const [creatorVersion, setCreatorVersion] = useState(0)
  const [scenario, setScenario] = useState<ReceiverScenario>('current')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleted, setDeleted] = useState(false)
  const [exhausted, setExhausted] = useState(false)
  const [url, setUrl] = useState('/prototype/file-sharing#receive')

  const handleCreated = useCallback((created: PrototypeShare) => {
    setShare(created)
    setGeneration((value) => value + 1)
    setScenario('current')
    setDeleted(false)
    setExhausted(false)
    const link = new URL(window.location.href)
    link.hash = 'receive'
    setUrl(link.href)
    setDialogOpen(true)
  }, [])
  const handleExhausted = useCallback(() => setExhausted(true), [])

  return <Tabs.Root value={screen} onValueChange={navigate} className="relative min-h-screen bg-(--bg-base)">
    {screen === 'create' ? <div className="retro-grid" /> : null}
    <div className="relative border-b border-(--border-subtle) bg-(--bg-base)/95">
      <div className="mx-auto max-w-225 space-y-3 px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-(--text-secondary)">
          <p>本地原型 · 文件不会上传</p>
          <Link href="/" className="inline-flex items-center gap-1 underline underline-offset-4"><ArrowLeft className="size-3" aria-hidden="true" />现有首页</Link>
        </div>
          <Tabs.List aria-label="原型场景" className="flex gap-1">
            {([['create', '创建分享'], ['receive', '接收下载'], ['manage', '后台管理']] as const).map(([value, label]) => <Tabs.Trigger key={value} value={value} className="rounded-md px-3 py-2 text-sm text-(--text-secondary) outline-none focus-visible:ring-2 focus-visible:ring-(--accent-primary) data-[state=active]:bg-(--bg-elevated) data-[state=active]:text-(--accent-primary)">{label}</Tabs.Trigger>)}
          </Tabs.List>
      </div>
    </div>
    <main className="relative mx-auto max-w-225 px-6 py-8">
      <Tabs.Content value="create" forceMount hidden={screen !== 'create'} className="mx-auto w-full max-w-175 outline-none">
        <header className="mb-8 flex items-center justify-center gap-3"><Image src="/logo.svg" alt="Paste" width={48} height={48} priority /><h1 className="text-4xl font-semibold tracking-tight">创建分享</h1></header>
        <ShareCreator key={creatorVersion} onCreated={handleCreated} />
      </Tabs.Content>
      <Tabs.Content value="receive" forceMount hidden={screen !== 'receive'} className="mx-auto w-full max-w-175 space-y-4 outline-none">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-(--text-secondary)">
          <label id="receiver-scenario">演示状态</label>
          <Select value={scenario} onValueChange={(value) => setScenario(value as ReceiverScenario)}>
            <SelectTrigger aria-labelledby="receiver-scenario" size="sm" className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent className="animate-none!"><SelectItem value="current">当前分享</SelectItem><SelectItem value="protected">需要密码</SelectItem><SelectItem value="expired">已过期</SelectItem><SelectItem value="exhausted">次数用尽</SelectItem></SelectContent>
          </Select>
          {scenario === 'protected' && !share.options.password ? <p className="w-full">示例密码：<code className="text-(--text-primary)">paste-demo</code></p> : null}
        </div>
        <ShareReceiver key={`${generation}-${scenario}`} share={share} scenario={scenario} deleted={deleted} exhausted={exhausted} onBack={() => navigate('create')} onExhausted={handleExhausted} />
      </Tabs.Content>
      <Tabs.Content value="manage" forceMount hidden={screen !== 'manage'} className="mx-auto w-full max-w-175 outline-none"><AdminPreview key={generation} share={share} currentExhausted={exhausted} onDeleteCurrent={() => setDeleted(true)} /></Tabs.Content>
    </main>
    <ShareCreatedDialog key={generation} share={share} url={url} open={dialogOpen} onOpenChange={setDialogOpen} onPreview={() => { setDialogOpen(false); navigate('receive') }} onCreateAnother={() => { setDialogOpen(false); setCreatorVersion((value) => value + 1); navigate('create') }} />
  </Tabs.Root>
}
