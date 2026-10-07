'use client'

import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getPasswordError } from '@/lib/paste-rules'
import { fileResponse, FileRequestError, type FileMetadata } from './file-client'

interface Props {
  pasteId: string
  hasPassword: boolean
  onVerified: (metadata: FileMetadata, password: string) => void
}

export function FileAccessForm({ pasteId, hasPassword, onVerified }: Props) {
  const id = useId()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const active = useRef<AbortController | null>(null)
  const errorRef = useRef<HTMLParagraphElement>(null)
  const passwordError = getPasswordError(password)
  useEffect(() => { if (error) errorRef.current?.focus() }, [error])
  useEffect(() => () => active.current?.abort(), [])
  const verify = async (event: FormEvent) => {
    event.preventDefault()
    if (active.current || passwordError || (hasPassword && !password)) return
    const controller = new AbortController()
    active.current = controller
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/files/${pasteId}/verify`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
        body: JSON.stringify(hasPassword ? { password } : {}), signal: controller.signal,
      })
      const metadata = await fileResponse<FileMetadata>(response)
      if (!controller.signal.aborted) onVerified(metadata, password)
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof FileRequestError ? cause.message : '无法验证文件，请检查网络后重试。')
    } finally {
      active.current = null
      if (!controller.signal.aborted) setLoading(false)
    }
  }
  return <form onSubmit={verify} className="space-y-4">
    <div className="space-y-2">
      <h2 className="flex items-center gap-2 text-lg font-semibold"><Lock className="size-5 text-(--accent-primary)" aria-hidden="true" />{hasPassword ? '需要访问密码' : '查看文件信息'}</h2>
      <p className="text-sm text-(--text-secondary)">验证与查看文件信息不会扣除领取次数。</p>
    </div>
    {hasPassword ? <div className="space-y-2">
      <label htmlFor={id} className="text-sm text-(--text-secondary)">访问密码</label>
      <Input id={id} type="password" autoComplete="off" value={password} disabled={loading} onChange={(event) => setPassword(event.target.value)} aria-invalid={!!passwordError} aria-describedby={passwordError ? `${id}-error` : undefined} />
      {passwordError ? <p id={`${id}-error`} className="text-sm text-red-400">{passwordError}</p> : null}
    </div> : null}
    {error ? <p ref={errorRef} tabIndex={-1} role="alert" className="text-sm text-red-400">{error}</p> : null}
    <Button type="submit" className="w-full" disabled={loading || !!passwordError || (hasPassword && !password)}>{loading ? '正在验证…' : hasPassword ? '验证密码' : '查看文件信息'}</Button>
  </form>
}
