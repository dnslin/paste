'use client'

import { useEffect, useRef, useState } from 'react'
import type { ApiResponse } from '@/lib/api-response'
import type { ShareKind, ShareManagementMetadata } from '@/lib/share-management-contract'

type ManagementState = { status: 'loading' }
  | { status: 'unavailable' }
  | { status: 'error' }
  | { status: 'revoked' }
  | { status: 'ready'; share: ShareManagementMetadata }

async function readMetadata(url: string, token: string, signal: AbortSignal) {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal })
  if (response.status === 404) return null
  const body = await response.json() as ApiResponse<ShareManagementMetadata>
  if (!response.ok || !body.success) throw new Error(body.success ? `管理请求失败（${response.status}）` : body.error.message)
  return body.data
}

export function useShareManagement(kind: ShareKind, shareId: string, token: string) {
  const [state, setState] = useState<ManagementState>({ status: 'loading' })
  const [busy, setBusy] = useState(false)
  const [revokeError, setRevokeError] = useState<string | null>(null)
  const [reloadVersion, setReloadVersion] = useState(0)
  const request = useRef<AbortController | null>(null)
  const revoking = useRef(false)
  const recheck = useRef(false)
  const url = `/api/manage/${kind}/${shareId}`

  useEffect(() => {
    const controller = new AbortController()
    request.current = controller
    void readMetadata(url, token, controller.signal).then((share) => {
      if (!controller.signal.aborted) setState(share ? { status: 'ready', share } : { status: 'unavailable' })
    }).catch((cause: unknown) => {
      if (controller.signal.aborted) return
      console.error(`Load share management ${kind}/${shareId} failed:`, cause)
      setState({ status: 'error' })
    })
    return () => { request.current?.abort() }
  }, [url, token, kind, shareId, reloadVersion])

  function reload() {
    setState({ status: 'loading' })
    setReloadVersion((value) => value + 1)
  }

  async function revoke() {
    if (revoking.current || state.status !== 'ready' || state.share.status !== 'active') return
    revoking.current = true
    setBusy(true)
    setRevokeError(null)
    const controller = new AbortController()
    request.current = controller
    try {
      if (recheck.current) {
        const share = await readMetadata(url, token, controller.signal)
        if (controller.signal.aborted) return
        if (!share) { setState({ status: 'unavailable' }); return }
        setState({ status: 'ready', share })
        if (share.status !== 'active') return
      }
      const response = await fetch(url, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: controller.signal,
      })
      if (controller.signal.aborted) return
      if (response.status === 404) { setState({ status: 'unavailable' }); return }
      const body = await response.json() as ApiResponse<{ revoked: true }>
      if (controller.signal.aborted) return
      if (!response.ok || !body.success) throw new Error(body.success ? `撤销请求失败（${response.status}）` : body.error.message)
      setState({ status: 'revoked' })
    } catch (cause) {
      if (controller.signal.aborted) return
      console.error(`Revoke share ${kind}/${shareId} failed:`, cause)
      recheck.current = true
      setRevokeError('暂时无法确认撤销结果，请重试。')
    } finally {
      revoking.current = false
      if (!controller.signal.aborted) setBusy(false)
    }
  }

  return { state, busy, revokeError, reload, revoke }
}
