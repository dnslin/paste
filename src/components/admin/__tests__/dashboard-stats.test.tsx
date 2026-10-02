import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { DashboardStats } from '../dashboard-stats'

vi.mock('../stats-cards', () => ({ StatsCards: ({ data }: { data: { total: number } }) => <p>累计分享：{data.total}</p> }))
vi.mock('../trend-chart', () => ({ TrendChart: () => null }))
const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock) })
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('DashboardStats', () => {
  it('错误响应结束加载，重试后呈现最新统计', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ success: false, error: { code: 'INTERNAL_ERROR', message: '统计暂时不可用' } }, { status: 500 }))
      .mockResolvedValueOnce(Response.json({ success: true, data: { total: 12, todayCount: 2, activeCount: 8, dailyTrend: [] } }))
    render(<DashboardStats />)
    expect(await screen.findByRole('alert')).toHaveTextContent('统计暂时不可用')
    fireEvent.click(screen.getByRole('button', { name: '重试' }))
    expect(await screen.findByText('累计分享：12')).toBeInTheDocument()
  })

  it('卸载统计组件时取消正在进行的请求', () => {
    let signal: AbortSignal | undefined
    fetchMock.mockImplementation(async (_url, options) => {
      signal = options?.signal ?? undefined
      return new Promise<Response>(() => {})
    })
    const { unmount } = render(<DashboardStats />)
    unmount()
    expect(signal?.aborted).toBe(true)
  })
})
