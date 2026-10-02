'use client'

import { useId, useRef, useState, type FormEvent } from 'react'
import { Lock, Loader2, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ApiResponse } from '@/lib/api-response'
import { getPasswordError } from '@/lib/paste-rules'

export interface PasteContent {
  content: string
  language: string
  remainingViews: number | null
}

interface PasteAccessFormProps {
  pasteId: string
  hasPassword: boolean
  burnCount: number | null
  onSuccess: (paste: PasteContent) => void
}

export function PasteAccessForm({ pasteId, hasPassword, burnCount, onSuccess }: PasteAccessFormProps) {
  const passwordId = useId()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submitting = useRef(false)
  const passwordError = hasPassword ? getPasswordError(password) : null

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting.current || passwordError || (hasPassword && !password.trim())) return
    submitting.current = true
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/pastes/${pasteId}/verify`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hasPassword ? { password } : {}),
      })
      const response: ApiResponse<PasteContent> = await res.json()
      if (response.success && res.ok) onSuccess(response.data)
      else setError(response.success ? '无法读取内容，请稍后重试。' : response.error.message)
    } catch {
      setError('无法读取内容，请检查网络连接后重试。')
    } finally {
      submitting.current = false
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-md space-y-4 rounded-xl border border-(--border-subtle) bg-(--bg-surface) p-6 sm:p-8">
      <div className="space-y-2 text-center">
        {hasPassword ? <Lock className="mx-auto size-8 text-(--accent-primary)" aria-hidden="true" /> : <Eye className="mx-auto size-8 text-(--accent-primary)" aria-hidden="true" />}
        <h2 className="text-xl font-semibold">{hasPassword ? '需要访问密码' : '查看受次数限制的内容'}</h2>
        {burnCount !== null ? <p className="text-sm text-(--text-secondary)">剩余 {burnCount} 次查看机会。成功读取后将扣除一次，次数用完后停止公开访问。</p> : <p className="text-sm text-(--text-secondary)">输入创建者设置的密码后查看内容。</p>}
      </div>
      {hasPassword ? <div className="space-y-2">
        <label htmlFor={passwordId} className="text-sm text-(--text-secondary)">访问密码</label>
        <Input id={passwordId} type="password" autoComplete="current-password" placeholder="请输入密码…" value={password} onChange={(event) => setPassword(event.target.value)} disabled={loading} aria-invalid={!!passwordError} aria-describedby={passwordError ? `${passwordId}-error` : undefined} />
        {passwordError ? <p id={`${passwordId}-error`} className="text-sm text-red-400">{passwordError}</p> : null}
      </div> : null}
      {error ? <p role="alert" className="text-sm text-red-400">{error}</p> : null}
      <Button type="submit" className="w-full gap-2" disabled={loading || !!passwordError || (hasPassword && !password.trim())}>
        {loading ? <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" /> : null}
        {loading ? '正在读取…' : hasPassword ? '解锁内容' : '查看内容'}
      </Button>
    </form>
  )
}
