'use client'

import { useState, useSyncExternalStore } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Tabs } from 'radix-ui'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CreatedPreview } from './created-preview'
import { ManagementPreview } from './management-preview'
import { ReceiverPreview } from './receiver-preview'
import { type PrototypeScreen, type Scenario, type ShareKind } from './model'

function subscribe(listener: () => void) {
  window.addEventListener('hashchange', listener)
  window.addEventListener('popstate', listener)
  window.addEventListener('creator-revoke:navigate', listener)
  return () => { window.removeEventListener('hashchange', listener); window.removeEventListener('popstate', listener); window.removeEventListener('creator-revoke:navigate', listener) }
}
const getRoute = () => window.location.hash
const getServerRoute = () => ''
function navigate(kind: ShareKind, screen: PrototypeScreen) {
  window.history.pushState(null, '', `#${kind}/${screen}`)
  window.dispatchEvent(new Event('creator-revoke:navigate'))
}

export function CreatorRevokePrototype() {
  const route = useSyncExternalStore(subscribe, getRoute, getServerRoute)
  const [routeKind, routeScreen] = route.slice(1).split('/')
  const kind: ShareKind = routeKind === 'file' ? 'file' : 'text'
  const screen: PrototypeScreen = routeScreen === 'manage' || routeScreen === 'receive' ? routeScreen : 'created'
  const [revoked, setRevoked] = useState({ text: false, file: false })
  const [scenario, setScenario] = useState<Scenario>('current')
  const [failNext, setFailNext] = useState(false)
  const [generation, setGeneration] = useState(0)
  function navigateScreen(next: PrototypeScreen) {
    if (next === 'receive' && (scenario === 'invalid' || scenario === 'load-error')) setScenario('current')
    navigate(kind, next)
  }
  function reset() {
    setRevoked({ text: false, file: false })
    setScenario('current')
    setFailNext(false)
    setGeneration((value) => value + 1)
    navigate(kind, 'created')
  }
  const selectClass = 'min-w-0 rounded-md border border-(--border-default) bg-(--bg-elevated) px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-(--accent-primary)'
  const visibleScenario = screen === 'receive' && (scenario === 'invalid' || scenario === 'load-error') ? 'current' : scenario
  return <Tabs.Root value={screen} onValueChange={(value) => navigateScreen(value as PrototypeScreen)} className="relative min-h-screen bg-(--bg-base)">
    <div className="border-b border-(--border-subtle)"><div className="mx-auto max-w-225 space-y-4 px-4 py-4 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-(--text-secondary)"><p>交互原型 · 不会创建或撤销真实分享</p><Link href="/" className="underline underline-offset-4">现有首页</Link></div>
      <div className="flex flex-wrap items-center gap-3"><label htmlFor="revoke-kind" className="text-xs text-(--text-secondary)">分享类型</label><select id="revoke-kind" value={kind} onChange={(event) => { setScenario('current'); setFailNext(false); navigate(event.target.value as ShareKind, screen) }} className={selectClass}><option value="text">文本 / 代码</option><option value="file">文件</option></select><Button type="button" size="sm" variant="ghost" onClick={reset} className="ml-auto"><RotateCcw aria-hidden="true" />重置演示</Button></div>
      <Tabs.List aria-label="原型场景" className="grid grid-cols-3 gap-1">
        {([['created', '创建成功'], ['manage', '私人管理页'], ['receive', '接收者页面']] as const).map(([value, label]) => <Tabs.Trigger key={value} value={value} className="min-w-0 rounded-md px-1 py-2 text-xs text-(--text-secondary) outline-none focus-visible:ring-2 focus-visible:ring-(--accent-primary) data-[state=active]:bg-(--bg-elevated) data-[state=active]:text-(--accent-primary) sm:px-3 sm:text-sm">{label}</Tabs.Trigger>)}
      </Tabs.List>
      {screen !== 'created' ? <div className="flex flex-wrap items-center gap-3 border-t border-(--border-subtle) pt-3"><label htmlFor="revoke-scenario" className="text-xs text-(--text-secondary)">演示状态</label><select id="revoke-scenario" value={visibleScenario} onChange={(event) => setScenario(event.target.value as Scenario)} className={selectClass}><option value="current">当前分享</option><option value="expired">已过期</option><option value="exhausted">次数用尽</option>{screen === 'manage' ? <><option value="invalid">无效管理链接</option><option value="load-error">加载失败</option></> : null}</select>{screen === 'manage' && scenario === 'current' && !revoked[kind] ? <label className="flex items-center gap-2 text-xs text-(--text-secondary)"><input type="checkbox" checked={failNext} onChange={(event) => setFailNext(event.target.checked)} className="size-4 accent-(--accent-primary)" />下次撤销失败</label> : null}</div> : null}
    </div></div>
    <main className="mx-auto max-w-225 px-4 py-8 sm:px-6">
      <header className="mb-8 flex items-center justify-center gap-3"><Image src="/logo.svg" alt="" width={40} height={40} priority /><div><h1 className="text-2xl font-semibold tracking-tight">Paste</h1><p className="mt-1 text-xs text-(--text-secondary)">随时结束自己的分享</p></div></header>
      <div className="mx-auto max-w-175">
        <Tabs.Content value="created" className="outline-none"><CreatedPreview key={`${kind}-${generation}`} kind={kind} revoked={revoked[kind]} onNavigate={navigateScreen} onReset={reset} /></Tabs.Content>
        <Tabs.Content value="manage" className="outline-none"><ManagementPreview key={`${kind}-${scenario}-${generation}`} kind={kind} scenario={scenario} revoked={revoked[kind]} failNext={failNext} onAttempt={() => setFailNext(false)} onRevoked={() => setRevoked((value) => ({ ...value, [kind]: true }))} onRetryLoad={() => setScenario('current')} onReset={reset} /></Tabs.Content>
        <Tabs.Content value="receive" className="outline-none"><ReceiverPreview key={`${kind}-${generation}`} kind={kind} scenario={visibleScenario} revoked={revoked[kind]} /></Tabs.Content>
      </div>
      <p className="mx-auto mt-6 max-w-175 text-xs leading-6 text-(--text-secondary)">文本与文件均可体验。所有状态仅保存在当前页面，刷新会重置；在本页返回已撤销分享的管理页时，会显示统一失效提示。</p>
    </main>
  </Tabs.Root>
}
