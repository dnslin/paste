'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Flame, Clock, FileX } from 'lucide-react'
import { PasswordPrompt } from './password-prompt'
import { CopyButton } from './copy-button'

type PasteStatus = 'active' | 'expired' | 'destroyed' | 'not_found'

interface PasteViewerProps {
  pasteId: string
  initialStatus: PasteStatus
  hasPassword: boolean
  language: string
  burnCount: number | null
  initialContent?: string
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function PasteViewer({
  pasteId,
  initialStatus,
  hasPassword,
  language,
  burnCount,
  initialContent
}: PasteViewerProps) {
  const [content, setContent] = useState<string | null>(initialContent ?? null)
  const [currentLanguage, setCurrentLanguage] = useState(language)
  const [remainingViews, setRemainingViews] = useState(burnCount)
  const [highlightedHtml, setHighlightedHtml] = useState<string>('')
  const viewRecordedRef = useRef(false)

  useEffect(() => {
    if (!content || remainingViews === null || remainingViews <= 0 || viewRecordedRef.current || hasPassword) {
      return
    }

    let cancelled = false
    viewRecordedRef.current = true

    const recordView = async () => {
      try {
        const res = await fetch(`/api/pastes/${pasteId}/view`, { method: 'POST' })
        if (cancelled) return
        if (res.ok) {
          const data = await res.json()
          if (data.success && data.data && typeof data.data.remainingViews === 'number') {
            setRemainingViews(data.data.remainingViews)
          }
        }
      } catch {
        // View recording failure is non-critical
      }
    }

    recordView()

    return () => {
      cancelled = true
    }
  }, [content, pasteId, remainingViews, hasPassword])

  useEffect(() => {
    if (!content) return

    let cancelled = false

    const highlight = async () => {
      try {
        const { codeToHtml } = await import('shiki')
        if (cancelled) return
        const html = await codeToHtml(content, { 
          lang: currentLanguage || 'text', 
          theme: 'vitesse-dark' 
        })
        if (!cancelled) {
          setHighlightedHtml(html)
        }
      } catch {
        if (!cancelled) {
          setHighlightedHtml(`<pre><code>${escapeHtml(content)}</code></pre>`)
        }
      }
    }

    highlight()

    return () => {
      cancelled = true
    }
  }, [content, currentLanguage])

  const handlePasswordSuccess = useCallback((decryptedContent: string, decryptedLanguage: string, newRemainingViews: number | null) => {
    setContent(decryptedContent)
    setCurrentLanguage(decryptedLanguage)
    if (newRemainingViews !== null) {
      setRemainingViews(newRemainingViews)
    }
  }, [])

  if (initialStatus === 'not_found') {
    return (
      <div className="flex flex-col items-center justify-center min-h-100 text-center" role="status">
        <FileX className="size-16 text-(--text-muted) mb-4" aria-hidden="true" />
        <h2 className="text-xl font-semibold text-(--text-primary)">Paste Not Found</h2>
        <p className="mt-2 text-(--text-secondary)">This paste doesn&apos;t exist or has been deleted.</p>
      </div>
    )
  }

  if (initialStatus === 'expired') {
    return (
      <div className="flex flex-col items-center justify-center min-h-100 text-center" role="status">
        <Clock className="size-16 text-(--text-muted) mb-4" aria-hidden="true" />
        <h2 className="text-xl font-semibold text-(--text-primary)">Paste Expired</h2>
        <p className="mt-2 text-(--text-secondary)">This paste has expired and is no longer available.</p>
      </div>
    )
  }

  if (initialStatus === 'destroyed') {
    return (
      <div className="flex flex-col items-center justify-center min-h-100 text-center" role="status">
        <Flame className="size-16 text-amber-500 mb-4" aria-hidden="true" />
        <h2 className="text-xl font-semibold text-(--text-primary)">Paste Destroyed</h2>
        <p className="mt-2 text-(--text-secondary)">This paste has been viewed the maximum number of times and is now destroyed.</p>
      </div>
    )
  }

  if (hasPassword && !content) {
    return <PasswordPrompt pasteId={pasteId} onSuccess={handlePasswordSuccess} />
  }

  if (content) {
    return (
      <div className="space-y-4">
        {remainingViews !== null && remainingViews > 0 && (
          <div 
            className="flex items-center gap-2 px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500"
            role="alert"
          >
            <Flame className="size-5" aria-hidden="true" />
            <span className="text-sm font-medium">
              {remainingViews} view{remainingViews !== 1 ? 's' : ''} remaining before destruction
            </span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-sm text-(--text-secondary)">{currentLanguage}</span>
          <CopyButton content={content} />
        </div>

        <div 
          className="rounded-lg overflow-hidden border border-(--border-subtle) bg-[#121212] p-4 text-sm font-mono overflow-x-auto"
          dangerouslySetInnerHTML={{ __html: highlightedHtml || `<pre>${escapeHtml(content)}</pre>` }} 
        />
      </div>
    )
  }

  return null
}
