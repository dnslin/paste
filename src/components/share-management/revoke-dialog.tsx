'use client'

import { useRef, type RefObject } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface RevokeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  busy: boolean
  error: string | null
  onConfirm: () => void
  returnFocus: RefObject<HTMLButtonElement | null>
  resultFocus: RefObject<HTMLHeadingElement | null>
}

export function RevokeDialog({ open, onOpenChange, busy, error, onConfirm, returnFocus, resultFocus }: RevokeDialogProps) {
  const cancelButton = useRef<HTMLButtonElement>(null)
  return <Dialog open={open} onOpenChange={(value) => { if (!busy) onOpenChange(value) }}>
    <DialogContent showCloseButton={false} className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md motion-reduce:animate-none"
      onOpenAutoFocus={(event) => { event.preventDefault(); cancelButton.current?.focus() }}
      onCloseAutoFocus={(event) => { event.preventDefault(); (resultFocus.current ?? returnFocus.current)?.focus() }}
      onEscapeKeyDown={(event) => { if (busy) event.preventDefault() }}
      onPointerDownOutside={(event) => { if (busy) event.preventDefault() }}>
      <DialogHeader><DialogTitle>撤销这次分享？</DialogTitle><DialogDescription className="leading-6">撤销后，新的查看和下载请求将被阻止，且无法恢复。</DialogDescription></DialogHeader>
      <p className="text-sm leading-6 text-(--text-secondary)">已经显示、复制或下载的内容，以及已经开始传输的文件，无法收回。</p>
      {error ? <p role="alert" className="text-sm leading-6 text-red-400">{error}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <Button ref={cancelButton} type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>继续分享</Button>
        <Button type="button" variant="destructive" disabled={busy} onClick={onConfirm}>{busy ? '正在撤销…' : error ? '重试撤销' : '确认撤销'}</Button>
      </div>
    </DialogContent>
  </Dialog>
}
