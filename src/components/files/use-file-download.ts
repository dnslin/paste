'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { downloadName, fileResponse, FileRequestError } from './file-client'

const sessionEvent = 'paste-file-claim-changed'
function subscribe(callback: () => void) {
  window.addEventListener(sessionEvent, callback)
  return () => window.removeEventListener(sessionEvent, callback)
}
function readKey(id: string) {
  try { return sessionStorage.getItem(`paste:file-claim:${id}`) } catch { return null }
}
function createKey(id: string) {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  const key = btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
  // Persist before the request so a lost response or refresh retries the exact claim.
  sessionStorage.setItem(`paste:file-claim:${id}`, key)
  window.dispatchEvent(new Event(sessionEvent))
  return key
}

type Phase = 'idle' | 'claiming' | 'downloading' | 'preparing' | 'ready'
interface Grant { expiresAt: string; remainingDownloads: number }

export function useFileDownload(pasteId: string, initialRemaining: number) {
  const key = useSyncExternalStore(subscribe, useCallback(() => readKey(pasteId), [pasteId]), () => null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [expired, setExpired] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [remaining, setRemaining] = useState(initialRemaining)
  const [grantExpiry, setGrantExpiry] = useState<string | null>(null)
  const active = useRef<AbortController | null>(null)
  const objectUrls = useRef(new Set<string>())
  useEffect(() => {
    const urls = objectUrls.current
    return () => {
      active.current?.abort()
      urls.forEach((url) => URL.revokeObjectURL(url))
      urls.clear()
    }
  }, [])

  const download = async (password?: string, fileName?: string, fresh = false) => {
    if (active.current || blocked || (expired && !fresh)) return
    const controller = new AbortController()
    active.current = controller
    setError(null)
    setPhase('claiming')
    try {
      let claimKey = readKey(pasteId)
      if (!claimKey || fresh) {
        try { claimKey = createKey(pasteId) } catch {
          throw new Error('浏览器无法保留下载凭证。请允许此站点使用会话存储后重试。')
        }
        setGrantExpiry(null)
      }
      setExpired(false)
      const response = await fetch(`/api/files/${pasteId}/claim`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
        signal: controller.signal, body: JSON.stringify({ password: password || undefined, claimKey }),
      })
      const grant = await fileResponse<Grant>(response)
      if (controller.signal.aborted) return
      setRemaining(grant.remainingDownloads)
      setGrantExpiry(grant.expiresAt)
      setPhase('downloading')
      const result = await fetch(`/api/files/${pasteId}/download`, {
        headers: { Authorization: `Bearer ${claimKey}` }, cache: 'no-store', signal: controller.signal,
      })
      if (!result.ok) await fileResponse<never>(result)
      const blob = await result.blob()
      if (controller.signal.aborted) return
      setPhase('preparing')
      await new Promise<void>((resolve) => setTimeout(resolve, 0))
      if (controller.signal.aborted) return
      const url = URL.createObjectURL(blob)
      objectUrls.current.add(url)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = downloadName(result.headers.get('Content-Disposition'), fileName || `file-${pasteId}`)
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      // Give the browser time to start its download before releasing the Blob.
      setTimeout(() => {
        if (objectUrls.current.delete(url)) URL.revokeObjectURL(url)
      }, 1000)
      setPhase('ready')
    } catch (cause) {
      if (controller.signal.aborted) return
      if (cause instanceof FileRequestError) {
        if (cause.code === 'GRANT_EXPIRED') {
          setExpired(true)
          setError('本次下载凭证已过期。重新领取会再扣除 1 次，请确认后继续。')
        } else {
          if ([401, 403, 404, 410].includes(cause.status)) setBlocked(true)
          setError(cause.message)
        }
      } else {
        setError(cause instanceof Error && cause.message.startsWith('浏览器无法') ? cause.message : '下载未完成，请检查网络后重试。已有凭证会沿用，不会重复扣次。')
      }
      setPhase('idle')
    } finally {
      if (active.current === controller) active.current = null
    }
  }
  const cancel = () => {
    active.current?.abort()
    active.current = null
    setPhase('idle')
    setError('下载已取消。若领取已完成，重试会沿用同一凭证，不重复扣次。')
  }
  return { key, phase, error, expired, blocked, remaining, grantExpiry, download, cancel, updateRemaining: setRemaining,
    busy: phase === 'claiming' || phase === 'downloading' || phase === 'preparing' }
}
