import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { StatsCards } from '../stats-cards'

// These tests cover the statistic labels; chart rendering belongs to Recharts.
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AreaChart: ({ children }: { children: ReactNode }) => <svg>{children}</svg>,
  Area: () => null,
}))

afterEach(cleanup)

function stats(today: number, yesterday: number) {
  return { total: 10, activeCount: 8, todayCount: today, dailyTrend: [{ date: '2026-10-01', count: yesterday }, { date: '2026-10-02', count: today }] }
}

describe('StatsCards', () => {
  it('昨日为零、今日有记录时显示新增，避免无意义的 +0%', () => {
    render(<StatsCards data={stats(5, 0)} />)
    expect(screen.getByText('新增')).toBeInTheDocument()
    expect(screen.queryByText('+0%')).not.toBeInTheDocument()
    expect(screen.getByText('今日（UTC）')).toBeInTheDocument()
  })

  it('昨日有记录时显示实际增长百分比', () => {
    render(<StatsCards data={stats(5, 2)} />)
    expect(screen.getByText('+150%')).toBeInTheDocument()
  })

  it('连续两天没有记录时不显示新增或增长比例', () => {
    render(<StatsCards data={stats(0, 0)} />)
    expect(screen.queryByLabelText('与昨日相比')).not.toBeInTheDocument()
  })
})
