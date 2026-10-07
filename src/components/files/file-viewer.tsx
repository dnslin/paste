'use client'

import { useEffect, useRef, useState } from 'react'
import { Download, FileIcon, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PasteStatus } from '@/lib/paste'
import { FileAccessForm } from './file-access-form'
import { formatFileSize, type FileMetadata } from './file-client'
import { useFileDownload } from './use-file-download'

interface Props {
  pasteId: string
  initialStatus: PasteStatus | 'not_found' | 'error'
  hasPassword: boolean
  burnCount: number
}

export function FileViewer({ pasteId, initialStatus, hasPassword, burnCount }: Props) {
  const [metadata, setMetadata] = useState<FileMetadata | null>(null)
  const [password, setPassword] = useState('')
  const transfer = useFileDownload(pasteId, burnCount)
  const errorRef = useRef<HTMLParagraphElement>(null)
  useEffect(() => { if (transfer.error) errorRef.current?.focus() }, [transfer.error])
  const unavailable = initialStatus === 'expired' || initialStatus === 'not_found' || initialStatus === 'error'
  const showAccess = !unavailable && !transfer.blocked && !metadata && transfer.remaining > 0 && (!transfer.key || hasPassword)
  const canDownload = !unavailable && !transfer.blocked && (!!transfer.key || (!!metadata && transfer.remaining > 0))
  const labels = { idle: transfer.key ? '重试下载文件' : '下载文件', claiming: '正在领取下载授权…', downloading: '正在下载文件…', preparing: '正在准备保存…', ready: '重试下载文件' }

  return <section className="space-y-6 rounded-xl border border-(--border-subtle) bg-(--bg-surface) p-6 sm:p-8">
    <header className="flex items-center gap-3">
      <FileIcon className="size-8 shrink-0 text-(--accent-primary)" aria-hidden="true" />
      <div><h1 className="text-2xl font-semibold text-(--text-primary)">文件分享</h1><p className="text-sm text-(--text-secondary)">私密附件 · 仅供下载</p></div>
    </header>
    {unavailable ? <p role="alert" className="text-sm text-(--text-secondary)">{initialStatus === 'error' ? '暂时无法加载文件，请刷新后重试。' : '文件已过期、已撤销或不存在。'}</p> : null}
    {!unavailable && !transfer.key && transfer.remaining === 0 ? <p className="text-sm text-(--text-secondary)">下载领取次数已用尽。</p> : null}
    {showAccess ? <FileAccessForm pasteId={pasteId} hasPassword={hasPassword} onVerified={(file, value) => { setMetadata(file); setPassword(value); transfer.updateRemaining(file.burnCount) }} /> : null}
    {metadata ? <dl className="space-y-3 rounded-lg border border-(--border-subtle) bg-(--bg-elevated) p-4 text-sm">
      <div><dt className="text-(--text-secondary)">文件名</dt><dd className="mt-1 break-all font-medium">{metadata.fileName}</dd></div>
      <div className="flex flex-wrap gap-x-8 gap-y-3"><div><dt className="text-(--text-secondary)">大小</dt><dd className="mt-1 font-mono">{formatFileSize(metadata.size)}</dd></div><div><dt className="text-(--text-secondary)">有效期至</dt><dd className="mt-1">{new Date(metadata.expiresAt).toLocaleString('zh-CN')}</dd></div></div>
    </dl> : null}
    {!unavailable && transfer.key && !metadata ? <p className="text-sm text-(--text-secondary)">{hasPassword ? '此标签页保留了领取凭证，可以直接重试；若上次领取未完成，请先验证密码。' : '此标签页保留了领取凭证，可以直接重试；服务器会再次检查有效期。'}</p> : null}
    {!unavailable ? <p className="text-sm text-(--text-secondary)">剩余可领取次数：{transfer.remaining}。已有有效凭证仍可重试。</p> : null}
    {transfer.error ? <p ref={errorRef} tabIndex={-1} role="alert" className="text-sm text-red-400">{transfer.error}</p> : null}
    {transfer.grantExpiry && !transfer.expired ? <p className="text-sm text-(--text-secondary)">本次授权有效期至 {new Date(transfer.grantExpiry).toLocaleString('zh-CN')}，分享撤销后立即失效。</p> : null}
    {transfer.phase === 'ready' ? <p role="status" className="text-sm text-(--text-secondary)">文件已交给浏览器，请检查下载列表；这不代表已成功保存。</p> : null}
    {canDownload || transfer.blocked ? <div className="space-y-3">
      {transfer.expired && transfer.remaining > 0 ? <Button className="w-full" disabled={transfer.busy || (hasPassword && !metadata)} onClick={() => void transfer.download(password, metadata?.fileName, true)}>重新领取并下载（扣 1 次）</Button> : <Button className="w-full gap-2" disabled={transfer.busy || transfer.blocked || transfer.expired} onClick={() => void transfer.download(password, metadata?.fileName)}>
        {transfer.busy ? <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" /> : <Download className="size-4" aria-hidden="true" />}{labels[transfer.phase]}
      </Button>}
      {transfer.busy ? <Button variant="outline" className="w-full" onClick={transfer.cancel}>取消下载</Button> : null}
    </div> : null}
    <p className="border-t border-(--border-subtle) pt-4 text-sm leading-6 text-(--text-secondary)">领取后扣一次；15 分钟内可重试，分享过期即失效。下载中断后将从头重试。文件可能有害，请仅打开可信来源的文件。</p>
  </section>
}
