'use client'

import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CreatedLink } from '@/components/paste/success-dialog'
import type { CreatedFileShare } from '@/lib/file-share-contract'
import { formatExpiry } from './presentation'

interface FileCreatedDialogProps {
  result: CreatedFileShare
  fileName: string
  hasPassword: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateAnother: () => void
  onCloseAutoFocus?: (event: Event) => void
}

export function FileCreatedContent({ result, fileName, hasPassword, onCreateAnother }: Pick<FileCreatedDialogProps, 'result' | 'fileName' | 'hasPassword' | 'onCreateAnother'>) {
  return <>
      <div className="space-y-2 text-sm"><p className="font-medium [overflow-wrap:anywhere]">{fileName}</p><p className="text-xs text-(--text-secondary)">{formatExpiry(result.expiresAt)} · {result.downloadLimit === null ? '不限次数' : `${result.downloadLimit} 次下载`} · {hasPassword ? '密码保护' : '无密码'}</p></div>
      <CreatedLink key={result.url} url={result.url} />
      <Button type="button" variant="ghost" onClick={onCreateAnother} className="w-full">创建另一条</Button>
  </>
}

export function FileCreatedDialog({ result, fileName, hasPassword, open, onOpenChange, onCreateAnother, onCloseAutoFocus }: FileCreatedDialogProps) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent showCloseButton={false} className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md motion-reduce:animate-none" onCloseAutoFocus={onCloseAutoFocus}>
      <DialogHeader><DialogTitle>链接已生成</DialogTitle><DialogDescription className="sr-only">文件分享链接</DialogDescription></DialogHeader>
      <FileCreatedContent result={result} fileName={fileName} hasPassword={hasPassword} onCreateAnother={() => { onOpenChange(false); onCreateAnother() }} />
      <DialogClose asChild><Button variant="ghost" size="icon" className="absolute right-2 top-2" aria-label="关闭成功提示"><X aria-hidden="true" /></Button></DialogClose>
    </DialogContent>
  </Dialog>
}
