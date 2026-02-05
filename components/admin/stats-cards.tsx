'use client'

import { useState, useEffect } from 'react'
import { Database, CalendarPlus, Activity, AlertCircle } from 'lucide-react'

interface Stats {
  total: number
  todayCount: number
  activeCount: number
}

export function StatsCards() {
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

  const cards = [
    { label: 'Total Pastes', value: stats?.total ?? 0, icon: Database },
    { label: 'Today', value: stats?.todayCount ?? 0, icon: CalendarPlus },
    { label: 'Active', value: stats?.activeCount ?? 0, icon: Activity },
  ]

  if (error) {
    return (
      <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 flex items-center gap-3">
        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
        <p className="text-sm text-red-500">{error}</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center">
              <card.icon className="w-5 h-5 text-[var(--accent-primary)]" />
            </div>
            <div>
              {loading ? (
                <div className="h-8 w-16 bg-[var(--bg-elevated)] rounded animate-pulse" />
              ) : (
                <p className="text-2xl font-bold text-[var(--text-primary)]">{card.value}</p>
              )}
              <p className="text-sm text-[var(--text-secondary)]">{card.label}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
