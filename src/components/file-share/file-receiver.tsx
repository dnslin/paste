'use client'

import { useId, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { ArrowLeft, AlertCircle, Clock, Download, File as FileIcon, FileX, Lock, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { FileShareMetadata } from '@/lib/file-share-contract'
import { getPasswordError } from '@/lib/paste-rules'
import { formatBytes, formatExpiry } from './presentation'
import { useFileDownload } from './use-file-download'

const unavailableStates = {
  not_found: { title: '分享不存在', icon: FileX },
  expired: { title: '分享已过期', icon: Clock },
  exhausted: { title: '下载机会已用尽', icon: FileX },
  deleted: { title: '分享已删除', icon: FileX },
  error: { title: '暂时无法读取分享', icon: AlertCircle },
}

export function FileReceiver({ initialMetadata, initialError = false }: { initialMetadata: FileShareMetadata | null; initialError?: boolean }) {
  const id = useId()
  const [password, setPassword] = useState('')
  const access = useFileDownload(initialMetadata, initialError)
  const passwordError = getPasswordError(password)
  const { metadata, unavailable, busy, ready, error } = access

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!passwordError) void access.download(password)
  }

  if (unavailable || !metadata) {
    const { title, icon: Icon } = unavailableStates[unavailable ?? 'not_found']
    return <div role="status" className="flex min-h-100 flex-col items-center justify-center gap-3 text-center">
      <Icon className="size-12 text-(--text-secondary)" aria-hidden="true" /><h1 className="text-xl font-semibold">{title}</h1>
      <p className="text-sm text-(--text-secondary)">{unavailable === 'error' ? '请稍后刷新页面重试。' : '请联系分享者获取新链接。'}</p>
      <Link href="/" className="mt-2 text-sm text-(--accent-primary) underline underline-offset-4">创建自己的分享</Link>
    </div>
  }

  const locked = metadata.hasPassword && metadata.fileName === undefined
  const remaining = metadata.downloadsRemaining
  const downloadLabel = access.phase === 'downloading' ? '正在下载文件…'
    : busy ? locked ? '正在验证…' : '正在准备…'
    : remaining === 0 ? '下载机会已用尽'
    : locked ? '验证密码并下载' : '下载文件'
  return <div className="space-y-5">
    <Link href="/" className="inline-flex items-center gap-2 text-sm text-(--accent-primary) underline underline-offset-4"><ArrowLeft className="size-4" aria-hidden="true" />返回首页</Link>
    <form onSubmit={submit} className="overflow-hidden rounded-xl border border-(--border-subtle) bg-(--bg-surface)">
      <div className="space-y-6 p-5 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="pt-1 text-(--text-secondary)">{locked ? <Lock className="size-6" aria-hidden="true" /> : <FileIcon className="size-6" aria-hidden="true" />}</span>
          <div className="min-w-0 space-y-2"><h1 className="text-xl font-semibold [overflow-wrap:anywhere]">{locked ? '受密码保护的分享' : metadata.fileName}</h1>{metadata.size !== undefined ? <p className="font-mono text-sm text-(--text-secondary)">{formatBytes(metadata.size)}</p> : null}</div>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-3 border-y border-(--border-subtle) py-4 text-sm text-(--text-secondary)">
          <span className="inline-flex items-center gap-2"><Clock className="size-4" aria-hidden="true" />{formatExpiry(metadata.expiresAt)}</span>
          <span className="inline-flex items-center gap-2"><Download className="size-4" aria-hidden="true" />{remaining === null ? '不限次数' : `剩余 ${remaining} 次下载机会`}</span>
        </div>
        {locked ? <div className="space-y-2"><label htmlFor={id} className="text-sm font-medium">访问密码</label><Input id={id} type="password" autoComplete="current-password" placeholder="输入密码" value={password} disabled={busy}
          onChange={(event) => { setPassword(event.target.value); access.clearError() }} aria-invalid={!!error || !!passwordError} aria-describedby={error || passwordError ? `${id}-error` : undefined} /></div> : null}
        {error || passwordError ? <p id={`${id}-error`} role="alert" className="text-sm text-red-400">{error || passwordError}</p> : null}
        {ready ? <p role="status" className="text-sm text-(--text-secondary)">已发起下载。{remaining === 0 ? '这是最后一次机会。' : ''}</p> : null}
        <Button type="submit" size="lg" disabled={busy || remaining === 0 || !!passwordError || (locked && !password)} className="h-11 w-full gap-2">
          {busy ? <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" /> : <Download className="size-4" aria-hidden="true" />}
          {downloadLabel}
        </Button>
        {remaining !== null && remaining > 0 ? <p className="text-xs text-(--text-secondary)">每次下载扣 1 次，中断也计次。</p> : null}
      </div>
    </form>
  </div>
}
