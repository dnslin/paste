'use client'

import { useState, useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import { StatsCards } from './stats-cards'
import { TrendChart } from './trend-chart'

interface DailyTrend {
  date: string
  count: number
}

interface Stats {
  total: number
  todayCount: number
  activeCount: number
  dailyTrend: DailyTrend[]
}

function DashboardSkeleton() {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg bg-(--bg-surface) border border-(--border-subtle) p-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-(--bg-elevated) animate-pulse" />
              <div className="flex-1">
                <div className="h-8 w-20 bg-(--bg-elevated) rounded animate-pulse mb-1" />
                <div className="h-4 w-24 bg-(--bg-elevated) rounded animate-pulse" />
              </div>
            </div>
            <div className="mt-4 h-10 bg-(--bg-elevated) rounded animate-pulse" />
          </div>
        ))}
      </div>
      <div className="rounded-lg bg-(--bg-surface) border border-(--border-subtle) p-6">
        <div className="h-5 w-32 bg-(--bg-elevated) rounded animate-pulse mb-4" />
        <div className="h-[200px] md:h-[300px] bg-(--bg-elevated) rounded animate-pulse" />
      </div>
    </>
  )
}

export function DashboardStats() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStats(data.data)
        } else {
          setError(data.error?.message || 'Failed to load stats')
        }
      })
      .catch(() => setError('Failed to load stats'))
      .finally(() => setLoading(false))
  }, [])

  if (error) {
    return (
      <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 flex items-center gap-3">
        <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
        <p className="text-sm text-red-500">{error}</p>
      </div>
    )
  }

  if (loading || !stats) {
    return <DashboardSkeleton />
  }

  return (
    <>
      <StatsCards data={stats} />
      <TrendChart data={stats.dailyTrend} />
    </>
  )
}
