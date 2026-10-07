'use client'

import { useEffect, useRef, useState } from 'react'
import type { ApiResponse } from '@/lib/api-response'

interface UploadedFile { id: string; url: string; expiresAt: string }
export interface FileUploadOptions { password: string; expiresIn: number; burnAfterRead: number }

export function useFileUpload() {
  const [phase, setPhase] = useState<'idle' | 'uploading' | 'processing'>('idle')
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uncertain, setUncertain] = useState(false)
  const [checked, setChecked] = useState(false)
  const [result, setResult] = useState<UploadedFile | null>(null)
  const active = useRef<XMLHttpRequest | null>(null)
  useEffect(() => () => {
    if (active.current) {
      active.current.onload = null
      active.current.onerror = null
      active.current.onabort = null
      active.current.ontimeout = null
      active.current.abort()
    }
  }, [])
  const upload = (file: File, options: FileUploadOptions) => {
    if (active.current || (uncertain && !checked)) return
    const xhr = new XMLHttpRequest()
    active.current = xhr
    setPhase('uploading')
    setProgress(null)
    setError(null)
    setResult(null)
    setChecked(false)
    const finish = () => { active.current = null; setPhase('idle') }
    const ambiguous = (message: string) => {
      if (active.current !== xhr) return
      setError(`${message}服务端可能已创建分享，请先检查管理列表，避免重复上传。`)
      setUncertain(true)
      finish()
    }
    xhr.open('POST', '/api/files')
    xhr.timeout = 65000
    xhr.upload.onprogress = (event) => {
      if (active.current !== xhr) return
      if (event.lengthComputable) {
        setProgress(Math.min(100, Math.round(event.loaded / event.total * 100)))
        if (event.loaded >= event.total) setPhase('processing')
      }
    }
    xhr.upload.onload = () => { if (active.current === xhr) { setProgress(100); setPhase('processing') } }
    xhr.onload = () => {
      if (active.current !== xhr) return
      try {
        const response: ApiResponse<UploadedFile> = JSON.parse(xhr.responseText)
        if (response.success && xhr.status >= 200 && xhr.status < 300) {
          setResult(response.data)
          setUncertain(false)
        } else if (!response.success) {
          setError(response.error.message)
          setUncertain(false)
        } else {
          ambiguous('上传响应异常。')
          return
        }
        finish()
      } catch { ambiguous('无法确认上传结果。') }
    }
    xhr.onerror = () => ambiguous('上传连接中断。')
    xhr.ontimeout = () => ambiguous('上传已超时。')
    xhr.onabort = () => ambiguous('上传已取消。')
    const form = new FormData()
    form.append('file', file)
    if (options.password) form.append('password', options.password)
    form.append('expiresIn', String(options.expiresIn))
    form.append('burnAfterRead', String(options.burnAfterRead))
    try { xhr.send(form) } catch { ambiguous('无法提交上传。') }
  }
  return { phase, progress, error, uncertain, checked, setChecked, result, upload,
    busy: phase !== 'idle', cancel: () => active.current?.abort(), clearResult: () => setResult(null) }
}
