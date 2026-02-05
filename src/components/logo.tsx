'use client'

import { useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

const CLICK_THRESHOLD = 5
const TIME_WINDOW_MS = 2000

export function Logo() {
  const router = useRouter()
  const clickTimestamps = useRef<number[]>([])

  const handleClick = useCallback(async () => {
    const now = Date.now()
    
    clickTimestamps.current = clickTimestamps.current.filter(
      (timestamp) => now - timestamp < TIME_WINDOW_MS
    )
    
    clickTimestamps.current.push(now)
    
    if (clickTimestamps.current.length >= CLICK_THRESHOLD) {
      clickTimestamps.current = []
      
      try {
        const res = await fetch('/api/admin/check')
        const data = await res.json()
        
        if (data.authenticated) {
          router.push('/admin')
        } else {
          router.push('/admin/login')
        }
      } catch {
        router.push('/admin/login')
      }
    }
  }, [router])

  return (
    <button
      type="button"
      onClick={handleClick}
      className="focus:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-primary) rounded-lg transition-transform hover:scale-105 active:scale-95"
      aria-label="Logo"
    >
      <Image
        src="/logo.svg"
        alt="Paste Creator Logo"
        width={48}
        height={48}
        priority
      />
    </button>
  )
}
