'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { motion, useReducedMotion } from 'framer-motion'
import type { ApiResponse } from '@/lib/api-response'

type Status = 'idle' | 'loading' | 'error'

export function LoginForm() {
  const router = useRouter()
  const reducedMotion = useReducedMotion()
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password || status === 'loading') return

    setStatus('loading')
    setErrorMessage('')

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      const data: ApiResponse<{ message: string }> = await res.json()

      if (data.success) {
        router.push('/admin')
        router.refresh()
      } else {
        setStatus('error')
        setErrorMessage(data.error.message)
      }
    } catch {
      setStatus('error')
      setErrorMessage('登录失败，请重试。')
    }
  }, [password, status, router])

  return (
    <form onSubmit={handleSubmit} aria-label="管理员登录" className="space-y-4">
      <label htmlFor="admin-password" className="block text-sm text-(--text-secondary)">管理员密码</label>
      <Input
        id="admin-password"
        type="password"
        placeholder="输入管理员密码"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={status === 'loading'}
        className="bg-(--bg-base)"
        autoComplete="current-password"
        autoFocus
      />

      <Button
        type="submit"
        className="w-full"
        disabled={!password || status === 'loading'}
      >
        {status === 'loading' ? (
          <>
            <Loader2 className="w-4 h-4 motion-safe:animate-spin mr-2" aria-hidden="true" />
            正在登录…
          </>
        ) : (
          '登录'
        )}
      </Button>

      {errorMessage && (
        <motion.div
          role="alert"
          aria-live="assertive"
          initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
          animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="flex items-center gap-2 text-sm text-red-500"
        >
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{errorMessage}</span>
        </motion.div>
      )}
    </form>
  )
}
