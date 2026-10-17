'use client'

import { useEffect, useRef, useState } from 'react'
import type { ApiResponse } from '@/lib/api-response'
import type { FileShareMetadata } from '@/lib/file-share-contract'
import { responseError } from './presentation'

export type UnavailableFileStatus = 'not_found' | 'expired' | 'exhausted' | 'deleted' | 'error'

export function useFileDownload(initialMetadata: FileShareMetadata | null, initialError: boolean) {
  const [metadata, setMetadata] = useState(initialMetadata)
  const [unavailable, setUnavailable] = useState<UnavailableFileStatus | null>(initialError ? 'error' : !initialMetadata ? 'not_found' : initialMetadata.status === 'active' ? null : initialMetadata.status)
  const [phase, setPhase] = useState<'requesting' | 'downloading' | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pending = useRef<AbortController | null>(null)
  const objectUrl = useRef<string | null>(null)

  useEffect(() => () => {
    const request = pending.current
    pending.current = null
    request?.abort()
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current)
  }, [])

  async function download(password: string) {
    if (pending.current || !metadata || unavailable || metadata.downloadsRemaining === 0) return
    const controller = new AbortController()
    pending.current = controller
    setPhase('requesting')
    setReady(false)
    setError(null)
    let remaining = metadata.downloadsRemaining
    try {
      const response = await fetch(`/api/files/${encodeURIComponent(metadata.id)}/download`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password || undefined }), signal: controller.signal,
      })
      if (pending.current !== controller) return
      if (!response.ok) {
        let body: ApiResponse<never> | null = null
        try { body = await response.json() } catch { /* Preserve a readable error for proxy responses. */ }
        if (pending.current !== controller) return
        if (body?.success === false) {
          const statuses: Record<string, UnavailableFileStatus> = { FILE_EXPIRED: 'expired', FILE_EXHAUSTED: 'exhausted', NOT_FOUND: 'not_found', FILE_DELETED: 'deleted' }
          if (statuses[body.error.code]) setUnavailable(statuses[body.error.code])
        }
        setError(responseError(response.status, body))
        return
      }
      const encodedName = response.headers.get('X-File-Name')
      const rawRemaining = response.headers.get('X-Downloads-Remaining')
      if (!encodedName || rawRemaining === null) throw new Error('Invalid download response')
      const fileName = decodeURIComponent(encodedName)
      const downloadsRemaining = rawRemaining === 'unlimited' ? null : Number(rawRemaining)
      if (downloadsRemaining !== null && (!Number.isInteger(downloadsRemaining) || downloadsRemaining < 0)) throw new Error('Invalid download count')
      // A successful claim consumes a download even if reading the body is interrupted.
      remaining = downloadsRemaining
      setMetadata({ ...metadata, fileName, downloadsRemaining })
      setPhase('downloading')
      const blob = await response.blob()
      if (pending.current !== controller) return
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current)
      const url = URL.createObjectURL(blob)
      objectUrl.current = url
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = fileName
      document.body.appendChild(anchor)
      try { anchor.click() } finally { anchor.remove() }
      setMetadata({ ...metadata, fileName, size: blob.size, downloadsRemaining })
      setReady(true)
    } catch {
      if (pending.current === controller) setError(remaining === 0
        ? '下载未完成，最后一次下载机会已计次。请联系分享者获取新链接。'
        : '下载未完成，请检查网络后重试。中断也会计次。')
    } finally {
      if (pending.current === controller) { pending.current = null; setPhase(null) }
    }
  }

  return { metadata, unavailable, busy: phase !== null, phase, ready, error, download, clearError: () => setError(null) }
}
