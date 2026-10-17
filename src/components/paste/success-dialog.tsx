'use client'

import { useEffect } from 'react'
import { Check, Copy, X } from 'lucide-react'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useClipboard } from './use-clipboard'

interface SuccessDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  url: string
  onCreateAnother: () => void
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
      <Button type="button" onClick={() => void copy()} className="w-full gap-2">
        {status === 'copied' ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
        {status === 'copied' ? '已复制' : '复制链接'}
      </Button>
    </div>
  )
}

export function SuccessDialog({ open, onOpenChange, url, onCreateAnother, onCloseAutoFocus }: SuccessDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md motion-reduce:animate-none" showCloseButton={false} onCloseAutoFocus={onCloseAutoFocus}>
        <DialogHeader>
          <DialogTitle>内容已创建</DialogTitle>
          <DialogDescription className="sr-only">分享链接</DialogDescription>
        </DialogHeader>
        <CreatedLink key={url} url={url} autoCopy />
        <DialogFooter>
          <Button variant="ghost" onClick={() => { onOpenChange(false); onCreateAnother() }} className="w-full">创建另一条</Button>
        </DialogFooter>
        <DialogClose asChild><Button variant="ghost" size="icon" className="absolute right-2 top-2" aria-label="关闭"><X className="size-4" /></Button></DialogClose>
      </DialogContent>
    </Dialog>
  )
}
