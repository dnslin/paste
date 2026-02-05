'use client'

import { Database, CalendarPlus, Activity } from 'lucide-react'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'

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

interface StatsCardsProps {
  data: Stats
}

interface StatCardProps {
  label: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  trend?: DailyTrend[]
  changePercent?: number
}

function StatCard({ label, value, icon: Icon, trend, changePercent }: StatCardProps) {
  const isPositive = changePercent !== undefined && changePercent >= 0
  const showChange = changePercent !== undefined && !isNaN(changePercent) && isFinite(changePercent)

  return (
    <div className="rounded-lg bg-(--bg-surface) border border-(--border-subtle) p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-(--bg-elevated) flex items-center justify-center">
            <Icon className="w-5 h-5 text-(--accent-primary)" />
          </div>
          <div>
            <p className="text-2xl font-bold text-(--text-primary)">{value.toLocaleString()}</p>
            <p className="text-sm text-(--text-secondary)">{label}</p>
          </div>
        </div>
        {showChange && (
          <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            <span>{isPositive ? '+' : ''}{changePercent.toFixed(0)}%</span>
          </div>
        )}
      </div>
      {trend && trend.length > 0 && (
        <div className="mt-4 h-10">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend}>
              <defs>
                <linearGradient id={`gradient-${label}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="count"
                stroke="var(--accent-primary)"
                strokeWidth={2}
                fill={`url(#gradient-${label})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

export function StatsCards({ data }: StatsCardsProps) {
  const dailyTrend = data.dailyTrend || []
  const todayCount = dailyTrend.length > 0 ? dailyTrend[dailyTrend.length - 1]?.count || 0 : 0
  const yesterdayCount = dailyTrend.length > 1 ? dailyTrend[dailyTrend.length - 2]?.count || 0 : 0
  const changePercent = yesterdayCount > 0 ? ((todayCount - yesterdayCount) / yesterdayCount) * 100 : 0

  const cards = [
    { 
      label: 'Total Pastes', 
      value: data.total, 
      icon: Database,
      trend: dailyTrend,
    },
    { 
      label: 'Today', 
      value: data.todayCount, 
      icon: CalendarPlus,
      changePercent: changePercent,
    },
    { 
      label: 'Active', 
      value: data.activeCount, 
      icon: Activity,
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {cards.map((card) => (
        <StatCard
          key={card.label}
          label={card.label}
          value={card.value}
          icon={card.icon}
          trend={card.trend}
          changePercent={card.changePercent}
        />
      ))}
    </div>
  )
}
