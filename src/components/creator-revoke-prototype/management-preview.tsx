'use client'

import { useEffect, useRef, useState } from 'react'
import { Ban, Check, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { type Scenario, type ShareKind } from './model'
import { ShareSummary } from './share-summary'

interface ManagementPreviewProps {
  kind: ShareKind
  scenario: Scenario
  revoked: boolean
  failNext: boolean
  onAttempt: () => void
  onRevoked: () => void
  onRetryLoad: () => void
  onReset: () => void
}

export function ManagementPreview({ kind, scenario, revoked, failNext, onAttempt, onRevoked, onRetryLoad, onReset }: ManagementPreviewProps) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(false)
  const [completed, setCompleted] = useState(false)
  const cancelButton = useRef<HTMLButtonElement>(null)
  const revokeButton = useRef<HTMLButtonElement>(null)
  const successTitle = useRef<HTMLHeadingElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  useEffect(() => { if (completed) successTitle.current?.focus() }, [completed])

  function revoke() {
    if (timer.current) return
    const shouldFail = failNext
    setPending(true)
    setError(false)
    onAttempt()
    timer.current = setTimeout(() => {
      timer.current = null
      setPending(false)
      if (shouldFail) { setError(true); return }
      setOpen(false)
      setCompleted(true)
      onRevoked()
    }, 550)
  }

  if (completed) return <section className="space-y-5 rounded-xl border border-(--border-subtle) bg-(--bg-surface) p-6" aria-labelledby="revoked-title">
    <Check className="size-7 text-green-400" aria-hidden="true" /><h2 ref={successTitle} tabIndex={-1} id="revoked-title" className="text-xl font-semibold outline-none">分享已撤销</h2>
    <p role="status" className="text-sm leading-6 text-(--text-secondary)">分享链接已失效，后续无法再查看或下载。</p>
    <p className="text-xs leading-6 text-(--text-secondary)">已查看、复制、下载的内容，以及已开始的传输无法收回。</p>
    <Button type="button" onClick={onReset}>创建新分享（重置演示）</Button>
  </section>

  if (revoked || scenario === 'invalid') return <section className="space-y-5 rounded-xl border border-(--border-subtle) bg-(--bg-surface) p-6">
    <KeyRound className="size-7 text-(--text-secondary)" aria-hidden="true" /><h2 className="text-xl font-semibold">管理链接无效或分享已失效</h2>
    <p className="text-sm leading-6 text-(--text-secondary)">请检查创建成功时保存的完整管理链接。如果分享已结束，则无需再撤销。</p>
    <Button type="button" variant="outline" onClick={onReset}>创建新分享（重置演示）</Button>
  </section>

  if (scenario === 'load-error') return <section className="space-y-5 rounded-xl border border-(--border-subtle) bg-(--bg-surface) p-6">
    <h2 className="text-xl font-semibold">暂时无法加载分享</h2><p role="alert" className="text-sm leading-6 text-(--text-secondary)">网络连接中断，尚未获取分享状态。请重试。</p><Button type="button" variant="outline" onClick={onRetryLoad}>重新加载</Button>
  </section>

  const ended = scenario === 'expired' || scenario === 'exhausted'
  return <section className="space-y-6 rounded-xl border border-(--border-subtle) bg-(--bg-surface) p-5 sm:p-6" aria-labelledby="management-title">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="management-title" className="text-xl font-semibold">管理这次分享</h2><span className={`rounded-md border px-2 py-1 text-xs ${ended ? 'border-(--border-default) text-(--text-secondary)' : 'border-green-900 text-green-400'}`}>{scenario === 'expired' ? '已过期' : scenario === 'exhausted' ? '次数已用尽' : '分享中'}</span></div>
    <ShareSummary kind={kind} scenario={scenario} />
    <p className="border-t border-(--border-subtle) pt-5 text-sm leading-6 text-(--text-secondary)">这是私人管理页。打开此页不会读取正文、下载文件或消耗次数。</p>
    {ended ? <p className="text-sm text-(--text-secondary)">分享已结束，无需再撤销。</p> : <div className="space-y-3"><Button ref={revokeButton} type="button" variant="destructive" onClick={() => { setError(false); setOpen(true) }}><Ban aria-hidden="true" />撤销分享</Button><p className="text-xs leading-6 text-(--text-secondary)">发错链接或想提前结束分享时，可以在这里撤销。</p></div>}
    <Dialog open={open} onOpenChange={(value) => { if (!pending) setOpen(value) }}>
      <DialogContent showCloseButton={false} className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md motion-reduce:animate-none" onOpenAutoFocus={(event) => { event.preventDefault(); cancelButton.current?.focus() }} onCloseAutoFocus={(event) => { event.preventDefault(); (successTitle.current ?? revokeButton.current)?.focus() }} onEscapeKeyDown={(event) => { if (pending) event.preventDefault() }} onPointerDownOutside={(event) => { if (pending) event.preventDefault() }}>
        <DialogHeader><DialogTitle>撤销这次分享？</DialogTitle><DialogDescription className="leading-6">撤销后，接收者无法再通过分享链接查看或下载，且无法恢复。</DialogDescription></DialogHeader>
        <p className="text-sm leading-6 text-(--text-secondary)">已查看、复制、下载的内容，以及已开始的传输无法收回。</p>
        {error ? <p role="alert" className="text-sm leading-6 text-red-400">撤销失败，分享仍在生效，请重试。</p> : null}
        <div className="grid gap-3 sm:grid-cols-2"><Button type="button" ref={cancelButton} variant="outline" disabled={pending} onClick={() => setOpen(false)}>继续分享</Button><Button type="button" variant="destructive" disabled={pending} onClick={revoke}>{pending ? '正在撤销…' : error ? '重试撤销' : '确认撤销'}</Button></div>
      </DialogContent>
    </Dialog>
  </section>
}
