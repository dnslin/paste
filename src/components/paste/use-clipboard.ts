'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type ClipboardStatus = 'idle' | 'copied' | 'error'

export function useClipboard(content: string) {
  const [feedback, setFeedback] = useState<{ content: string; status: ClipboardStatus }>({ content, status: 'idle' })
  const status = feedback.content === content ? feedback.status : 'idle'
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const request = useRef(0)

  useEffect(() => () => {
    request.current += 1
    if (timer.current) clearTimeout(timer.current)
  }, [content])

  const copy = useCallback(async () => {
    const currentRequest = ++request.current
    if (timer.current) clearTimeout(timer.current)
    try {
      await navigator.clipboard.writeText(content)
      if (currentRequest !== request.current) return
      setFeedback({ content, status: 'copied' })
      timer.current = setTimeout(() => setFeedback({ content, status: 'idle' }), 2000)
    } catch {
      if (currentRequest === request.current) setFeedback({ content, status: 'error' })
    }
  }, [content])

  return { status, copy }
}
