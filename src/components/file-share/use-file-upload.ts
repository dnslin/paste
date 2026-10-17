'use client'

import { useEffect, useRef, useState } from 'react'
import type { ApiResponse } from '@/lib/api-response'
import type { CreatedFileShare } from '@/lib/file-share-contract'
import { responseError, type FileShareOptions } from './presentation'

export function useFileUpload(onCreated: (result: CreatedFileShare) => void, onBusyChange?: (busy: boolean) => void) {
  const [phase, setPhase] = useState<'idle' | 'uploading' | 'completing'>('idle')
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const pending = useRef<XMLHttpRequest | null>(null)

  useEffect(() => () => {
    const request = pending.current
    pending.current = null
    request?.abort()
  }, [])

  function start(file: File, options: FileShareOptions) {
    if (pending.current) return
    const request = new XMLHttpRequest()
    pending.current = request
    setPhase('uploading')
    setProgress(null)
    setError(null)
    setNotice('')
    onBusyChange?.(true)

    function finish(message?: string) {
      pending.current = null
      setPhase('idle')
      onBusyChange?.(false)
      if (message) setError(message)
    }

    request.upload.onprogress = (event) => {
      if (pending.current !== request || !event.lengthComputable || event.total === 0) return
      const percent = Math.min(100, Math.floor(event.loaded / event.total * 100))
      setProgress(percent)
      if (percent === 100) setPhase('completing')
    }
    request.upload.onload = () => {
      if (pending.current !== request) return
      setProgress(100)
      setPhase('completing')
    }
    request.onload = () => {
      if (pending.current !== request) return
      let body: ApiResponse<CreatedFileShare> | null = null
      try { body = JSON.parse(request.responseText) } catch { /* Proxies may return HTML errors. */ }
      if (request.status === 201 && body?.success && body.data?.url) {
        finish()
        onCreated(body.data)
      } else {
        finish(responseError(request.status, body))
      }
    }
    request.onerror = () => {
      if (pending.current === request) finish('网络中断，文件已保留，请重试。')
    }
    request.ontimeout = request.onerror
    request.onabort = () => {
      if (pending.current === request) finish('上传已中断，请重试。')
    }
    const data = new FormData()
    data.append('file', file)
    if (options.password) data.append('password', options.password)
    data.append('expiresIn', String(options.expiresIn))
    data.append('downloadLimit', options.downloadLimit === null ? 'off' : String(options.downloadLimit))
    try {
      request.open('POST', '/api/files')
      request.send(data)
    } catch {
      finish('无法开始上传，请稍后重试。')
    }
  }

  function cancel() {
    const request = pending.current
    if (!request) return
    pending.current = null
    request.abort()
    setPhase('idle')
    onBusyChange?.(false)
    setNotice('已取消请求。已完成的分享仍会保留至到期。')
  }

  function clearFeedback() { setError(null); setNotice('') }

  return { phase, progress, error, notice, busy: phase !== 'idle', start, cancel, clearFeedback }
}
