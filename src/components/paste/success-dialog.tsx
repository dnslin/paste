'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Check, Copy, X } from 'lucide-react'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { formatExpiry } from '@/components/file-share/presentation'
import { getLanguageName } from '@/lib/languages'
import { useClipboard } from './use-clipboard'

interface PasteCreatedContentProps {
  url: string
  language: string
  expiresAt: string | null
  viewLimit: number | null
  hasPassword: boolean
  onCreateAnother: () => void
  autoCopy?: boolean
}

interface SuccessDialogProps extends Omit<PasteCreatedContentProps, 'autoCopy'> {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCloseAutoFocus?: (event: Event) => void
}

export function CreatedLink({ url, autoCopy = false }: { url: string; autoCopy?: boolean }) {
  const { status, copy } = useClipboard(url)
  useEffect(() => { if (autoCopy) void copy() }, [autoCopy, copy])

  return (
    <div className="flex flex-col gap-4">
      <a href={url} className="block break-all rounded-lg border border-(--border-subtle) bg-(--bg-elevated) p-3 font-mono text-sm text-(--accent-primary) underline underline-offset-4">
        {url}
      </a>
      <p role={status === 'error' ? 'alert' : 'status'} className={status === 'error' ? 'text-sm text-red-400' : 'sr-only'}>
        {status === 'copied' ? '链接已复制到剪贴板。' : status === 'error' ? '浏览器拒绝了复制，请重试或手动复制链接。' : ''}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Button type="button" onClick={() => void copy()} className="gap-2">
          {status === 'copied' ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
          {status === 'copied' ? '已复制' : '复制链接'}
        </Button>
        <Button variant="outline" asChild><Link href={url}>查看分享<ArrowUpRight className="size-4" aria-hidden="true" /></Link></Button>
      </div>
    </div>
  )
}

export function PasteCreatedContent({ url, language, expiresAt, viewLimit, hasPassword, onCreateAnother, autoCopy = false }: PasteCreatedContentProps) {
  return <>
    <div className="space-y-2 text-sm">
      <p className="font-medium">{getLanguageName(language)}</p>
      <p className="text-xs text-(--text-secondary)">{expiresAt === null ? '永不过期' : formatExpiry(expiresAt)} · {viewLimit === null ? '不限次数' : `${viewLimit} 次查看`} · {hasPassword ? '密码保护' : '无密码'}</p>
    </div>
    <CreatedLink key={url} url={url} autoCopy={autoCopy} />
    <Button type="button" variant="ghost" onClick={onCreateAnother} className="w-full">创建另一条</Button>
  </>
}

export function SuccessDialog({ open, onOpenChange, url, language, expiresAt, viewLimit, hasPassword, onCreateAnother, onCloseAutoFocus }: SuccessDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md motion-reduce:animate-none" showCloseButton={false} onCloseAutoFocus={onCloseAutoFocus}>
        <DialogHeader>
          <DialogTitle>链接已生成</DialogTitle>
          <DialogDescription className="sr-only">分享链接</DialogDescription>
        </DialogHeader>
        <PasteCreatedContent url={url} language={language} expiresAt={expiresAt} viewLimit={viewLimit} hasPassword={hasPassword}
          autoCopy onCreateAnother={() => { onOpenChange(false); onCreateAnother() }} />
        <DialogClose asChild><Button variant="ghost" size="icon" className="absolute right-2 top-2" aria-label="关闭"><X className="size-4" /></Button></DialogClose>
      </DialogContent>
    </Dialog>
  )
}
