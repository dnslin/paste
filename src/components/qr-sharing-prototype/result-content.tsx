'use client'

import { ShareCreatedContent } from '@/components/share-result/share-created-content'
import { getLanguageName } from '@/lib/languages'
import type { PrototypeShare } from '@/components/file-sharing-prototype/model'

interface ResultContentProps {
  share: PrototypeShare
  url: string
  autoCopy?: boolean
  onCreateAnother: () => void
}

export function ResultContent({ share, url, autoCopy = false, onCreateAnother }: ResultContentProps) {
  if (!url) return <p className="text-center text-sm text-(--text-secondary)">正在准备二维码…</p>

  return <ShareCreatedContent url={url} kind={share.item.kind}
    name={share.item.kind === 'file' ? share.item.file.name : getLanguageName(share.item.language)}
    expiresAt="2026-10-22T08:00:00.000Z" limit={share.options.limit} hasPassword={!!share.options.password}
    autoCopy={autoCopy} onCreateAnother={onCreateAnother} />
}
