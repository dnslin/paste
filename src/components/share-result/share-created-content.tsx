'use client'

import { useEffect, type ReactNode } from 'react'
import { Check, Copy, X } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useClipboard } from '@/components/paste/use-clipboard'
import { formatExpiry } from '@/components/file-share/presentation'
import { PrivateManagementLink } from './private-management-link'

interface ShareCreatedContentProps {
  url: string
  managementUrl?: string
  name: string
  kind: 'text' | 'file'
  expiresAt: string | null
  limit: number | null
  hasPassword: boolean
  onCreateAnother: () => void
  autoCopy?: boolean
}

export function ShareCreatedContent({ url, managementUrl, name, kind, expiresAt, limit, hasPassword, onCreateAnother, autoCopy = false }: ShareCreatedContentProps) {
  const { copy, status } = useClipboard(url)
  useEffect(() => { if (autoCopy) void copy() }, [autoCopy, copy])

  return <div className="min-w-0 space-y-4">
    <p className="text-center text-sm font-medium text-(--text-secondary) [overflow-wrap:anywhere] [text-wrap:balance]">{name}</p>
    <figure className="flex flex-col items-center gap-3 py-1">
      <div className="rounded-xl bg-white p-2">
        <QRCodeSVG value={url} size={192} level="M" marginSize={4} bgColor="#fff" fgColor="#000"
          role="img" title={`${kind === 'file' ? '文件' : '文本'}分享链接二维码`} />
      </div>
      <figcaption className="text-sm text-(--text-secondary)">手机扫码打开分享</figcaption>
    </figure>
    <div className="space-y-2">
      <div className="flex min-w-0 items-center rounded-lg border border-(--border-subtle) bg-(--bg-elevated) p-1">
        <a href={url} title={url}
          className="flex h-11 min-w-0 flex-1 items-center rounded-md px-3 font-mono text-xs text-(--text-secondary) underline-offset-4 hover:text-(--text-primary) hover:underline focus-visible:outline-2 focus-visible:outline-(--accent-primary)">
          <span className="truncate">{url}</span>
        </a>
        <Button type="button" onClick={() => void copy()} className="h-11 w-26 gap-2 transition-colors motion-reduce:transition-none">
          {status === 'copied' ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
          {status === 'copied' ? '已复制' : '复制链接'}
        </Button>
      </div>
      {status === 'error' ? <p role="alert" className="text-center text-sm text-red-400">浏览器拒绝了复制，请重试或手动复制链接。</p>
        : <p role="status" className="sr-only">{status === 'copied' ? '链接已复制到剪贴板。' : ''}</p>}
    </div>
    <div role="group" aria-label="分享规则" className="text-center text-xs leading-5 text-(--text-secondary)">
      <p>{expiresAt === null ? '永不过期' : formatExpiry(expiresAt)}</p>
      <p>{limit === null ? '不限次数' : `${limit} 次${kind === 'file' ? '下载' : '查看'}`} · {hasPassword ? '密码保护 · 密码请单独提供' : '无密码'}</p>
    </div>
    {managementUrl ? <PrivateManagementLink key={managementUrl} url={managementUrl} /> : null}
    <div className="grid grid-cols-2 gap-2 border-t border-(--border-subtle) pt-3">
      <Button variant="ghost" asChild className="h-11 text-(--text-secondary) transition-colors motion-reduce:transition-none"><a href={url}>查看分享</a></Button>
      <Button type="button" variant="ghost" onClick={onCreateAnother} className="h-11 text-(--text-secondary) transition-colors motion-reduce:transition-none">创建另一条</Button>
    </div>
  </div>
}

interface ShareCreatedDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCloseAutoFocus?: (event: Event) => void
  children: ReactNode
}

export function ShareCreatedDialog({ open, onOpenChange, onCloseAutoFocus, children }: ShareCreatedDialogProps) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent showCloseButton={false} onCloseAutoFocus={onCloseAutoFocus}
      className="max-h-[calc(100dvh-2rem)] gap-2 overflow-y-auto rounded-xl border-(--border-default) bg-(--bg-surface) p-5 sm:max-w-md sm:p-6 motion-reduce:animate-none">
      <DialogHeader className="sm:text-center">
        <DialogTitle className="text-xl leading-7">链接已生成</DialogTitle>
        <DialogDescription className="sr-only">分享链接和二维码</DialogDescription>
      </DialogHeader>
      {children}
      <DialogClose asChild><Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1 size-11 transition-colors motion-reduce:transition-none" aria-label="关闭"><X className="size-4" aria-hidden="true" /></Button></DialogClose>
    </DialogContent>
  </Dialog>
}
