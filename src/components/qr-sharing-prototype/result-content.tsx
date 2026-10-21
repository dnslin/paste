'use client'

import { useEffect } from 'react'
import { Check, Copy } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import { useClipboard } from '@/components/paste/use-clipboard'
import { getLanguageName } from '@/lib/languages'
import { formatExpiry } from '@/components/file-share/presentation'
import type { PrototypeShare } from '@/components/file-sharing-prototype/model'

interface ResultContentProps {
  share: PrototypeShare
  url: string
  autoCopy?: boolean
  onView: () => void
  onCreateAnother: () => void
}

export function ResultContent({ share, url, autoCopy = false, onView, onCreateAnother }: ResultContentProps) {
  const { copy, status } = useClipboard(url)
  const isFile = share.item.kind === 'file'
  const label = `${isFile ? '文件' : '文本'}分享链接二维码`
  useEffect(() => { if (autoCopy) void copy() }, [autoCopy, copy])

  return <div className="min-w-0 space-y-4">
    <p className="text-center text-sm font-medium text-(--text-secondary) [overflow-wrap:anywhere] [text-wrap:balance]">
      {share.item.kind === 'file' ? share.item.file.name : getLanguageName(share.item.language)}
    </p>
    <figure className="flex flex-col items-center gap-3 py-1">
      {url ? <div className="rounded-xl bg-white p-2">
        <QRCodeSVG value={url} size={192} level="M" marginSize={4} bgColor="#fff" fgColor="#000" role="img" title={label} />
      </div> : <p className="text-sm text-(--text-secondary)">正在准备二维码…</p>}
      <figcaption className="text-sm text-(--text-secondary)">手机扫码打开分享</figcaption>
    </figure>
    <div className="space-y-2">
      <div className="flex min-w-0 items-center rounded-lg border border-(--border-subtle) bg-(--bg-elevated) p-1">
        <a href={url} title={url} onClick={(event) => { event.preventDefault(); onView() }}
          className="flex h-11 min-w-0 flex-1 items-center rounded-md px-3 font-mono text-xs text-(--text-secondary) underline-offset-4 hover:text-(--text-primary) hover:underline focus-visible:outline-2 focus-visible:outline-(--accent-primary)">
          <span className="truncate">{url}</span>
        </a>
        <Button type="button" onClick={() => void copy()} className="h-11 w-26 gap-2 transition-colors motion-reduce:transition-none">
          {status === 'copied' ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
          {status === 'copied' ? '已复制' : '复制链接'}
        </Button>
      </div>
      {status === 'error' ? <p role="alert" className="text-center text-sm text-red-400">复制失败，请重试或手动复制链接。</p> : <p role="status" className="sr-only">{status === 'copied' ? '链接已复制。' : ''}</p>}
    </div>
    <div className="text-center text-xs leading-5 text-(--text-secondary)">
      <p>{formatExpiry('2026-10-22T08:00:00.000Z')}</p>
      <p>{share.options.limit} 次{isFile ? '下载' : '查看'} · {share.options.password ? '密码保护 · 密码请单独提供' : '无密码'}</p>
    </div>
    <div className="grid grid-cols-2 gap-2 border-t border-(--border-subtle) pt-3">
      <Button type="button" variant="ghost" onClick={onView} className="h-11 text-(--text-secondary) transition-colors motion-reduce:transition-none">查看分享</Button>
      <Button type="button" variant="ghost" onClick={onCreateAnother} className="h-11 text-(--text-secondary) transition-colors motion-reduce:transition-none">创建另一条</Button>
    </div>
  </div>
}
