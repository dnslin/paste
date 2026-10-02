'use client'

import { useState, useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ApiResponse } from '@/lib/api-response'
import { StatsCards } from './stats-cards'
import { TrendChart } from './trend-chart'

interface Stats {
  total: number
  todayCount: number
  activeCount: number
  dailyTrend: Array<{ date: string; count: number }>
}

function DashboardSkeleton() {
  return (
    <div role="status" className="space-y-4">
      <span className="sr-only">正在加载统计…</span>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((key) => <div key={key} className="h-36 rounded-lg bg-(--bg-surface) border border-(--border-subtle) motion-safe:animate-pulse" />)}
      </div>
      <div className="h-75 rounded-lg bg-(--bg-surface) border border-(--border-subtle) motion-safe:animate-pulse" />
    </div>
  )
}

export function DashboardStats() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadStats() {
      try {
        const res = await fetch('/api/admin/stats', { signal: controller.signal })
        const result: ApiResponse<Stats> = await res.json()
        if (controller.signal.aborted) return
        if (result.success) setStats(result.data)
        else setError(result.error.message)
      } catch {
        if (!controller.signal.aborted) setError('无法加载统计，请重试。')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    loadStats()
    return () => controller.abort()
  }, [attempt])

  if (error) {
    return (
      <div role="alert" className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="size-5 text-red-500 shrink-0" aria-hidden="true" />
          <p className="text-sm text-red-500">{error}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { setError(null); setLoading(true); setAttempt((value) => value + 1) }}>重试</Button>
      </div>
    )
  }

  if (loading || !stats) return <DashboardSkeleton />

  return <><StatsCards data={stats} /><TrendChart data={stats.dailyTrend} /></>
}
