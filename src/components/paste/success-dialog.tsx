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
}

function CreatedLink({ url }: { url: string }) {
  const { status, copy } = useClipboard(url)
  useEffect(() => { void copy() }, [copy])

  return (
    <div className="flex flex-col gap-4">
      <a href={url} className="block break-all rounded-lg border border-(--border-subtle) bg-(--bg-elevated) p-3 font-mono text-sm text-(--accent-primary) underline underline-offset-4">
        {url}
      </a>
      <p role={status === 'error' ? 'alert' : 'status'} className={status === 'error' ? 'text-sm text-red-400' : 'text-sm text-(--text-secondary)'}>
        {status === 'copied' ? '链接已复制到剪贴板。' : status === 'error' ? '浏览器拒绝了复制，请重试或手动选择链接复制。' : '可以复制链接，或点击链接查看内容。'}
      </p>
      <Button variant="outline" onClick={() => void copy()} className="w-full gap-2">
        {status === 'copied' ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
        {status === 'copied' ? '已复制' : '复制链接'}
      </Button>
    </div>
  )
}

export function SuccessDialog({ open, onOpenChange, url, onCreateAnother }: SuccessDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md motion-reduce:animate-none" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Check className="size-5 text-(--accent-primary)" aria-hidden="true" />内容已创建</DialogTitle>
          <DialogDescription>通过以下链接分享内容，请妥善保存链接。</DialogDescription>
        </DialogHeader>
        <CreatedLink key={url} url={url} />
        <DialogFooter>
          <Button onClick={() => { onOpenChange(false); onCreateAnother() }} className="w-full">创建另一条</Button>
        </DialogFooter>
        <DialogClose asChild><Button variant="ghost" size="icon" className="absolute right-2 top-2" aria-label="关闭"><X className="size-4" /></Button></DialogClose>
      </DialogContent>
    </Dialog>
  )
}
