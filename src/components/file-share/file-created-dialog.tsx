'use client'

import { ShareCreatedContent, ShareCreatedDialog } from '@/components/share-result/share-created-content'
import type { CreatedFileShare } from '@/lib/file-share-contract'

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
  return <ShareCreatedContent url={result.url} name={fileName} kind="file" expiresAt={result.expiresAt}
    limit={result.downloadLimit} hasPassword={hasPassword} onCreateAnother={onCreateAnother} />
}

export function FileCreatedDialog({ open, onOpenChange, onCloseAutoFocus, onCreateAnother, ...content }: FileCreatedDialogProps) {
  return <ShareCreatedDialog open={open} onOpenChange={onOpenChange} onCloseAutoFocus={onCloseAutoFocus}>
    <FileCreatedContent {...content} onCreateAnother={() => { onOpenChange(false); onCreateAnother() }} />
  </ShareCreatedDialog>
}
