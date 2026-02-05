'use client'

import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { AlertCircle } from 'lucide-react'

interface TrendData {
  date: string
  count: number
}

interface TrendChartProps {
  data?: TrendData[]
  loading?: boolean
}

function ChartSkeleton() {
  return (
    <div className="rounded-lg bg-(--bg-surface) border border-(--border-subtle) p-6">
      <div className="h-5 w-32 bg-(--bg-elevated) rounded animate-pulse mb-4" />
      <div className="h-[200px] md:h-[300px] bg-(--bg-elevated) rounded animate-pulse" />
    </div>
  )
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ value: number; payload: { date: string } }>
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null

  const data = payload[0]
  const date = new Date(data.payload.date)
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

  return (
    <div className="rounded-lg border border-(--border-subtle) bg-(--bg-surface) px-3 py-2 shadow-xl">
      <p className="text-sm font-medium text-(--text-primary)">{formattedDate}</p>
      <p className="text-sm text-(--text-secondary)">
        <span className="font-medium text-(--accent-primary)">{data.value}</span> pastes
      </p>
    </div>
  )
}

export function TrendChart({ data: externalData, loading: externalLoading }: TrendChartProps) {
  const [internalData, setInternalData] = useState<TrendData[]>([])
  const [internalLoading, setInternalLoading] = useState(!externalData)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (externalData) return

    fetch('/api/admin/stats')
      .then((res) => res.json())
      .then((result) => {
        if (result.success && result.data.dailyTrend) {
          setInternalData(result.data.dailyTrend)
        } else {
          setError('Failed to load trend data')
        }
      })
      .catch(() => setError('Failed to load trend data'))
      .finally(() => setInternalLoading(false))
  }, [externalData])

  const data = externalData || internalData
  const loading = externalLoading ?? internalLoading

  if (loading) {
    return <ChartSkeleton />
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 flex items-center gap-3">
        <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
        <p className="text-sm text-red-500">{error}</p>
      </div>
    )
  }

  const formatXAxis = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { weekday: 'short' })
  }

  return (
    <div className="rounded-lg bg-(--bg-surface) border border-(--border-subtle) p-6">
      <h3 className="text-sm font-medium text-(--text-secondary) mb-4">7-Day Activity</h3>
      <div className="h-[200px] md:h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="var(--border-subtle)" 
              vertical={false} 
            />
            <XAxis
              dataKey="date"
              tickFormatter={formatXAxis}
              tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: 'var(--border-subtle)' }}
            />
            <YAxis
              tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-elevated)', opacity: 0.5 }} />
            <Bar
              dataKey="count"
              fill="var(--accent-primary)"
              radius={[4, 4, 0, 0]}
              maxBarSize={50}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
