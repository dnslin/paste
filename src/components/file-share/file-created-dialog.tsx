'use client'

import Link from 'next/link'
import { Check, Copy, ArrowUpRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useClipboard } from '@/components/paste/use-clipboard'
import type { CreatedFileShare } from '@/lib/file-share-contract'
import { formatExpiry } from './presentation'

interface FileCreatedDialogProps {
  result: CreatedFileShare
  fileName: string
  hasPassword: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateAnother: () => void
}

export function FileCreatedDialog({ result, fileName, hasPassword, open, onOpenChange, onCreateAnother }: FileCreatedDialogProps) {
  const { copy, status } = useClipboard(result.url)
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent showCloseButton={false} className="sm:max-w-md motion-reduce:animate-none">
      <DialogHeader><DialogTitle>链接已创建</DialogTitle><DialogDescription className="sr-only">文件分享链接</DialogDescription></DialogHeader>
      <div className="space-y-2 text-sm"><p className="font-medium [overflow-wrap:anywhere]">{fileName}</p><p className="text-xs text-(--text-secondary)">{formatExpiry(result.expiresAt)} · {result.downloadLimit === null ? '不限次数' : `${result.downloadLimit} 次下载`}{hasPassword ? ' · 密码保护' : ''}</p></div>
      <a href={result.url} className="break-all rounded-lg border border-(--border-subtle) bg-(--bg-elevated) p-3 font-mono text-sm text-(--accent-primary) underline underline-offset-4">{result.url}</a>
      <div className="grid grid-cols-2 gap-3">
        <Button onClick={() => void copy()} className="gap-2">{status === 'copied' ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}{status === 'copied' ? '已复制' : '复制链接'}</Button>
        <Button variant="outline" asChild><Link href={result.url}>查看分享<ArrowUpRight aria-hidden="true" /></Link></Button>
      </div>
      {status === 'error' ? <p role="alert" className="text-sm text-red-400">复制失败，请手动复制链接。</p> : status === 'copied' ? <p role="status" className="sr-only">链接已复制。</p> : null}
      <Button variant="ghost" onClick={() => { onOpenChange(false); onCreateAnother() }}>创建另一条</Button>
      <DialogClose asChild><Button variant="ghost" size="icon" className="absolute right-2 top-2" aria-label="关闭成功提示"><X aria-hidden="true" /></Button></DialogClose>
    </DialogContent>
  </Dialog>
}
