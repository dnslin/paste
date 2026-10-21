'use client'

import { ShareCreatedContent, ShareCreatedDialog } from '@/components/share-result/share-created-content'
import { getLanguageName } from '@/lib/languages'

interface PasteCreatedContentProps {
  url: string
  managementUrl: string
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

export function PasteCreatedContent({ url, managementUrl, language, expiresAt, viewLimit, hasPassword, onCreateAnother, autoCopy = false }: PasteCreatedContentProps) {
  return <ShareCreatedContent url={url} managementUrl={managementUrl} name={getLanguageName(language)} kind="text" expiresAt={expiresAt}
    limit={viewLimit} hasPassword={hasPassword} onCreateAnother={onCreateAnother} autoCopy={autoCopy} />
}

export function SuccessDialog({ open, onOpenChange, onCloseAutoFocus, onCreateAnother, ...content }: SuccessDialogProps) {
  return <ShareCreatedDialog open={open} onOpenChange={onOpenChange} onCloseAutoFocus={onCloseAutoFocus}>
    <PasteCreatedContent {...content} autoCopy onCreateAnother={() => { onOpenChange(false); onCreateAnother() }} />
  </ShareCreatedDialog>
}
