'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ApiResponse } from '@/lib/api-response'

export function LogoutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogout = async () => {
    if (loading) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/logout', { method: 'POST' })
      const result: ApiResponse<{ message: string }> = await res.json()
      if (!result.success) {
        setError(result.error.message)
        return
      }
      router.push('/admin/login')
      router.refresh()
    } catch {
      setError('退出失败，请重试。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={handleLogout} disabled={loading} className="w-full justify-start text-(--text-secondary) hover:text-(--text-primary)">
        {loading ? <Loader2 className="size-4 motion-safe:animate-spin mr-2" aria-hidden="true" /> : <LogOut className="size-4 mr-2" aria-hidden="true" />}
        {loading ? '正在退出…' : '退出登录'}
      </Button>
      {error && <p role="alert" className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  )
}
