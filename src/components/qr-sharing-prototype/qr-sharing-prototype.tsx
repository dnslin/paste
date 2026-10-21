'use client'

import { useMemo, useRef, useState, useSyncExternalStore } from 'react'
import Image from 'next/image'
import { Tabs } from 'radix-ui'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ShareReceiver } from '@/components/file-sharing-prototype/share-receiver'
import { EXAMPLE_CONTENT, type PrototypeShare } from '@/components/file-sharing-prototype/model'
import { ResultContent } from './result-content'

function subscribe(listener: () => void) {
  window.addEventListener('hashchange', listener)
  return () => window.removeEventListener('hashchange', listener)
}
const getHref = () => window.location.href
const serverHref = () => ''
function navigate(view: string) { window.location.hash = view }

function exampleShare(kind: 'text' | 'file'): PrototypeShare {
  return kind === 'file'
    ? { item: { kind, file: new File([EXAMPLE_CONTENT], '项目交付说明与接口字段参考文档.md', { type: 'text/markdown' }) }, options: { password: '', expiresIn: 1440, limit: 3 } }
    : { item: { kind, content: 'const message = "Hello, Paste";\nconsole.log(message);\n', language: 'javascript' }, options: { password: 'paste-demo', expiresIn: 1440, limit: 3 } }
}

export function QrSharingPrototype() {
  const href = useSyncExternalStore(subscribe, getHref, serverHref)
  const hash = href ? new URL(href).hash : ''
  const kind = hash === '#result-file' || hash === '#receive-file' ? 'file' : 'text'
  const receiving = hash === '#receive-text' || hash === '#receive-file'
  const share = useMemo(() => exampleShare(kind), [kind])
  const url = href ? new URL(`#receive-${kind}`, href).href : ''
  const [hasResult, setHasResult] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const currentView = useRef<HTMLDivElement | null>(null)

  function selectKind(value: string) {
    setDialogOpen(false)
    setHasResult(true)
    navigate(`result-${value}`)
  }

  function viewShare() {
    setDialogOpen(false)
    navigate(`receive-${kind}`)
  }

  function createAnother() {
    setDialogOpen(false)
    setHasResult(false)
  }

  function restoreFocus(event: Event) {
    event.preventDefault()
    if (!window.location.hash.startsWith('#receive-')) currentView.current?.querySelector('button')?.focus()
  }

  return <Tabs.Root value={kind} onValueChange={selectKind} className="relative min-h-screen bg-(--bg-base)">
    {!receiving ? <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-40"><div className="retro-grid" /></div> : null}
    <div className="relative border-b border-(--border-subtle) bg-(--bg-base)/95">
      <div className="mx-auto max-w-225 space-y-2 px-4 py-3">
        <p className="text-center text-xs text-(--text-secondary)">二维码分享原型 · 演示数据，不创建真实分享</p>
        <div className="flex flex-wrap items-center justify-center gap-6">
          <Tabs.List aria-label="分享类型" className="flex gap-6 border-b border-(--border-subtle)">
            <Tabs.Trigger value="text" className="h-11 border-b-2 border-transparent px-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-(--accent-primary) data-[state=active]:border-(--accent-primary)">文本 / 代码</Tabs.Trigger>
            <Tabs.Trigger value="file" className="h-11 border-b-2 border-transparent px-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-(--accent-primary) data-[state=active]:border-(--accent-primary)">文件</Tabs.Trigger>
          </Tabs.List>
          <Button type="button" variant="outline" size="sm" disabled={receiving || !hasResult || !url} onClick={() => setDialogOpen(true)}>查看成功弹窗</Button>
        </div>
        {receiving && share.options.password ? <p className="text-center text-xs text-(--text-secondary)">演示访问密码：<code>paste-demo</code></p> : null}
      </div>
    </div>
    <Tabs.Content value={kind} className="outline-none">
    <main className="relative mx-auto max-w-225 px-4 py-6 sm:py-8">
      {receiving ? <div className="mx-auto max-w-175">
        <ShareReceiver key={kind} share={share} scenario="current" onBack={() => { setHasResult(true); navigate(`result-${kind}`) }} />
      </div> : <>
        <header className="mb-6 text-center">
          <div className="flex items-center justify-center gap-2"><Image src="/logo.svg" alt="Paste" width={36} height={36} priority /><h1 className="text-3xl font-semibold tracking-tight">Paste</h1></div>
          <p className="mt-2 text-sm text-(--text-secondary)">分享文本、代码和文件</p>
        </header>
        <div ref={currentView} className={`mx-auto max-w-md space-y-2 rounded-xl border border-(--border-default) bg-(--bg-surface) p-5 sm:p-6 ${dialogOpen ? 'invisible' : ''}`}>
          {hasResult && !dialogOpen ? <>
            <h2 className="text-center text-xl leading-7 font-semibold">链接已生成</h2>
            <ResultContent share={share} url={url} onView={viewShare} onCreateAnother={createAnother} />
          </> : null}
          {!hasResult ? <>
            <h2 className="text-center font-medium">{kind === 'file' ? '示例文件已准备' : '示例文本已准备'}</h2>
            <p className="text-center text-sm text-(--text-secondary) [overflow-wrap:anywhere]">{share.item.kind === 'file' ? share.item.file.name : 'JavaScript 文本 · 密码保护 · 3 次查看'}</p>
            <Button type="button" className="h-11 w-full" onClick={() => { setHasResult(true); setDialogOpen(true) }}>生成链接</Button>
          </> : null}
        </div>
      </>}
    </main>
    </Tabs.Content>
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent showCloseButton={false} onCloseAutoFocus={restoreFocus} className="max-h-[calc(100dvh-2rem)] gap-2 overflow-y-auto rounded-xl border-(--border-default) bg-(--bg-surface) p-5 sm:max-w-md sm:p-6 motion-reduce:animate-none">
        <DialogHeader className="sm:text-center"><DialogTitle className="text-xl leading-7">链接已生成</DialogTitle><DialogDescription className="sr-only">分享链接和二维码</DialogDescription></DialogHeader>
        <ResultContent share={share} url={url} autoCopy={kind === 'text'} onView={viewShare} onCreateAnother={createAnother} />
        <DialogClose asChild><Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1 size-11 transition-colors motion-reduce:transition-none" aria-label="关闭"><X className="size-4" aria-hidden="true" /></Button></DialogClose>
      </DialogContent>
    </Dialog>
  </Tabs.Root>
}
