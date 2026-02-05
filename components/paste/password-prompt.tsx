'use client'

import { useState, useCallback } from 'react'
import { Lock, AlertCircle, Clock, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { motion } from 'framer-motion'

interface PasswordPromptProps {
  pasteId: string
  onSuccess: (content: string, language: string, remainingViews: number | null) => void
}

type Status = 'idle' | 'loading' | 'error' | 'locked'

export function PasswordPrompt({ pasteId, onSuccess }: PasswordPromptProps) {
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!password.trim() || status === 'loading') return

    setStatus('loading')
    setErrorMessage('')

    try {
      const res = await fetch(`/api/pastes/${pasteId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      const data = await res.json()

      if (data.success) {
        onSuccess(data.data.content, data.data.language, data.data.remainingViews ?? null)
      } else {
        if (res.status === 429) {
          setStatus('locked')
          setErrorMessage(data.error.message)
        } else {
          setStatus('error')
          setErrorMessage(data.error.message)
        }
      }
    } catch {
      setStatus('error')
      setErrorMessage('Failed to verify password. Please try again.')
    }
  }, [password, pasteId, onSuccess, status])

  const isLocked = status === 'locked'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md mx-auto"
    >
      <div className="rounded-xl border border-(--border-subtle) bg-(--bg-surface) p-8">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-full bg-(--bg-elevated) border border-(--border-subtle) flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-(--accent-primary)" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-semibold text-(--text-primary) mb-2">
            Password Required
          </h2>
          <p className="text-sm text-(--text-secondary)">
            This paste is password protected
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="password"
            placeholder="Enter password..."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLocked || status === 'loading'}
            className="bg-(--bg-base)"
            autoFocus
          />

          <Button
            type="submit"
            className="w-full"
            disabled={!password.trim() || isLocked || status === 'loading'}
          >
            {status === 'loading' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Verifying...
              </>
            ) : (
              'Unlock Paste'
            )}
          </Button>
        </form>

        {errorMessage && (
          <motion.div
            role="alert"
            aria-live="assertive"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-4 flex items-center gap-2 text-sm ${
              isLocked ? 'text-amber-500' : 'text-red-500'
            }`}
          >
            {isLocked ? (
              <Clock className="w-4 h-4 shrink-0" aria-hidden="true" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            )}
            <span>{errorMessage}</span>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
