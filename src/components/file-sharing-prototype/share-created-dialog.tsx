'use client'

import { Check, Copy, ArrowUpRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useClipboard } from '@/components/paste/use-clipboard'
import { expiryLabel, itemName, type PrototypeShare } from './model'

interface ShareCreatedDialogProps {
  share: PrototypeShare
  url: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onPreview: () => void
  onCreateAnother: () => void
}

export function ShareCreatedDialog({ share, url, open, onOpenChange, onPreview, onCreateAnother }: ShareCreatedDialogProps) {
  const { copy, status } = useClipboard(url)
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent showCloseButton={false} className="sm:max-w-md motion-reduce:animate-none">
      <DialogHeader>
        <DialogTitle>链接已创建</DialogTitle>
        <DialogDescription>本地演示链接，刷新后失效。</DialogDescription>
      </DialogHeader>
      <div className="space-y-2 text-sm">
        <p className="font-medium [overflow-wrap:anywhere]">{itemName(share.item)}</p>
        <p className="text-xs text-(--text-secondary)">{share.options.expiresIn ? `${expiryLabel(share.options.expiresIn)}后到期` : '永不过期'} · {share.options.limit === null ? '不限次数' : `${share.options.limit} 次${share.item.kind === 'file' ? '下载机会' : '查看机会'}`}{share.options.password ? ' · 密码保护' : ''}</p>
      </div>
      <a href={url} onClick={(event) => { event.preventDefault(); onPreview() }} className="break-all rounded-lg border border-(--border-subtle) bg-(--bg-elevated) p-3 font-mono text-sm text-(--accent-primary) underline underline-offset-4">{url}</a>
      <div className="grid grid-cols-2 gap-3">
        <Button onClick={() => void copy()} className="gap-2">{status === 'copied' ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}{status === 'copied' ? '已复制' : '复制链接'}</Button>
        <Button variant="outline" onClick={onPreview} className="gap-2">查看分享<ArrowUpRight aria-hidden="true" /></Button>
      </div>
      {status === 'error' ? <p role="alert" className="text-sm text-red-400">复制失败，请手动复制链接。</p> : status === 'copied' ? <p role="status" className="sr-only">链接已复制。</p> : null}
      <Button variant="ghost" onClick={onCreateAnother}>创建另一条</Button>
      <DialogClose asChild><Button variant="ghost" size="icon" className="absolute right-2 top-2" aria-label="关闭成功提示"><X aria-hidden="true" /></Button></DialogClose>
    </DialogContent>
  </Dialog>
}
