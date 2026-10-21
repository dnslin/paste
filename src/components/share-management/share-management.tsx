'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Ban, Check, Code2, FileArchive, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatExpiry } from '@/components/file-share/presentation'
import { getLanguageName } from '@/lib/languages'
import type { ShareKind, ShareManagementMetadata } from '@/lib/share-management-contract'
import { RevokeDialog } from './revoke-dialog'
import { useShareManagement } from './use-share-management'

function subscribe(listener: () => void) {
  window.addEventListener('hashchange', listener)
  return () => window.removeEventListener('hashchange', listener)
}
const getToken = () => window.location.hash.slice(1)
const getServerToken = () => null

function Unavailable() {
  return <section className="space-y-5 rounded-xl border border-(--border-subtle) bg-(--bg-surface) p-5 sm:p-6">
    <KeyRound className="size-7 text-(--text-secondary)" aria-hidden="true" />
    <h1 className="text-xl font-semibold">管理链接无效或分享已失效</h1>
    <p className="text-sm leading-6 text-(--text-secondary)">请检查创建成功时保存的完整管理链接。如果分享已结束，则无需再撤销。</p>
    <Button asChild variant="outline"><Link href="/">创建新分享</Link></Button>
  </section>
}

function Loading() {
  return <section aria-busy="true" className="rounded-xl border border-(--border-subtle) bg-(--bg-surface) p-6">
    <p role="status" className="text-sm text-(--text-secondary)">正在加载分享状态…</p>
  </section>
}

function ShareSummary({ share }: { share: ShareManagementMetadata }) {
  const Icon = share.kind === 'file' ? FileArchive : Code2
  return <div className="space-y-3">
    <p className="text-xs text-(--text-secondary)">{share.kind === 'file' ? '文件分享' : '文本 / 代码分享'}</p>
    <p className="flex items-start gap-2 text-sm font-medium [overflow-wrap:anywhere]"><Icon className="mt-0.5 size-4 shrink-0 text-(--text-secondary)" aria-hidden="true" />{share.kind === 'file' ? share.fileName : getLanguageName(share.language)}</p>
    <div className="space-y-1 text-xs leading-6 text-(--text-secondary)">
      <p>{share.expiresAt === null ? '永不过期' : formatExpiry(share.expiresAt)}</p>
      <p>{share.remaining === null ? '不限次数' : `剩余 ${share.remaining} 次${share.kind === 'file' ? '下载' : '查看'}机会`}</p>
      <p>{share.hasPassword ? '密码保护' : '无密码'}</p>
    </div>
  </div>
}

function ManagedShare({ kind, shareId, token }: { kind: ShareKind; shareId: string; token: string }) {
  const { state, busy, revokeError, reload, revoke } = useShareManagement(kind, shareId, token)
  const [open, setOpen] = useState(false)
  const revokeButton = useRef<HTMLButtonElement>(null)
  const successTitle = useRef<HTMLHeadingElement>(null)
  useEffect(() => { if (state.status === 'revoked') successTitle.current?.focus() }, [state.status])

  if (state.status === 'loading') return <Loading />
  if (state.status === 'unavailable') return <Unavailable />
  if (state.status === 'error') return <section className="space-y-5 rounded-xl border border-(--border-subtle) bg-(--bg-surface) p-5 sm:p-6">
    <h1 className="text-xl font-semibold">暂时无法加载分享状态</h1>
    <p role="alert" className="text-sm leading-6 text-(--text-secondary)">请检查网络连接后重试。</p>
    <Button type="button" variant="outline" onClick={reload}>重新加载</Button>
  </section>
  if (state.status === 'revoked') return <section className="space-y-5 rounded-xl border border-(--border-subtle) bg-(--bg-surface) p-5 sm:p-6">
    <Check className="size-7 text-green-400" aria-hidden="true" />
    <h1 ref={successTitle} tabIndex={-1} className="text-xl font-semibold outline-none">分享已撤销</h1>
    <p role="status" className="text-sm leading-6 text-(--text-secondary)">分享链接已失效，后续无法再查看或下载。</p>
    <p className="text-xs leading-6 text-(--text-secondary)">已经显示、复制或下载的内容，以及已经开始传输的文件，无法收回。</p>
    <Button asChild><Link href="/">创建新分享</Link></Button>
  </section>

  const ended = state.share.status !== 'active'
  const status = state.share.status === 'expired' ? '已过期' : state.share.status === 'exhausted' ? '次数已用尽' : revokeError ? '撤销结果待确认' : '分享中'
  return <section className="space-y-6 rounded-xl border border-(--border-subtle) bg-(--bg-surface) p-5 sm:p-6" aria-labelledby="management-title">
    <div className="flex flex-wrap items-center justify-between gap-3"><h1 id="management-title" className="text-xl font-semibold">管理这次分享</h1><span className="rounded-md border border-(--border-default) px-2 py-1 text-xs text-(--text-secondary)">{status}</span></div>
    <ShareSummary share={state.share} />
    <p className="border-t border-(--border-subtle) pt-5 text-sm leading-6 text-(--text-secondary)">这是私人管理页。打开此页不会读取正文、下载文件或消耗次数。</p>
    {ended ? <p className="text-sm text-(--text-secondary)">分享已结束，无需再撤销。</p> : <div className="space-y-3">
      <Button ref={revokeButton} type="button" variant="destructive" onClick={() => setOpen(true)}><Ban aria-hidden="true" />撤销分享</Button>
      <p className="text-xs leading-6 text-(--text-secondary)">发错链接或想提前结束分享时，可以在这里撤销。</p>
      {revokeError && !open ? <p role="alert" className="text-sm leading-6 text-red-400">{revokeError}</p> : null}
    </div>}
    <RevokeDialog open={open && !ended} onOpenChange={setOpen} busy={busy} error={revokeError} onConfirm={() => void revoke()} returnFocus={revokeButton} resultFocus={successTitle} />
  </section>
}

export function ShareManagement({ kind, shareId }: { kind: ShareKind | null; shareId: string }) {
  const token = useSyncExternalStore(subscribe, getToken, getServerToken)
  return <div className="min-h-screen bg-(--bg-base)">
    <main className="mx-auto max-w-225 px-4 py-8 sm:px-6">
      <Link href="/" className="mx-auto mb-8 flex w-fit items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-(--accent-primary)"><Image src="/logo.svg" alt="" width={40} height={40} /><span className="text-2xl font-semibold tracking-tight">Paste</span></Link>
      <div className="mx-auto max-w-175">{token === null ? <Loading /> : !token || !kind ? <Unavailable /> : <ManagedShare key={`${kind}/${shareId}#${token}`} kind={kind} shareId={shareId} token={token} />}</div>
    </main>
  </div>
}
