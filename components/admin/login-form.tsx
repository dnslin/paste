'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { motion } from 'framer-motion'

type Status = 'idle' | 'loading' | 'error'

export function LoginForm() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim() || status === 'loading') return

    setStatus('loading')
    setErrorMessage('')

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      const data = await res.json()

      if (data.success) {
        router.push('/admin')
        router.refresh()
      } else {
        setStatus('error')
        setErrorMessage(data.error?.message || 'Invalid credentials')
      }
    } catch {
      setStatus('error')
      setErrorMessage('Failed to login. Please try again.')
    }
  }, [password, status, router])

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        type="password"
        placeholder="Enter admin password..."
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={status === 'loading'}
        className="bg-[var(--bg-base)]"
        autoFocus
      />

      <Button
        type="submit"
        className="w-full"
        disabled={!password.trim() || status === 'loading'}
      >
        {status === 'loading' ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Logging in...
          </>
        ) : (
          'Login'
        )}
      </Button>

      {errorMessage && (
        <motion.div
          role="alert"
          aria-live="assertive"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-sm text-red-500"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          <span>{errorMessage}</span>
        </motion.div>
      )}
    </form>
  )
}
