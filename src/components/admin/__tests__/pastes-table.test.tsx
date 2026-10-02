import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { PastesTable } from '../pastes-table'

function listing(page: number, pageSize: number, total: number) {
  const start = (page - 1) * pageSize
  return {
    items: Array.from({ length: Math.max(0, Math.min(pageSize, total - start)) }, (_, index) => ({
      id: `paste-${start + index + 1}`,
      createdAt: '2026-10-02T12:00:00Z',
      language: 'plaintext',
      status: 'active',
      hasPassword: false,
    })),
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    pageSize,
  }
}

function response(data: unknown) {
  return Response.json({ success: true, data })
}

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockReset()
  HTMLElement.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('PastesTable', () => {
  it('显示真实总数，并通过每页条数选择器更新列表请求', async () => {
    fetchMock.mockImplementation(async (url) => {
      const query = new URL(String(url), 'http://localhost').searchParams
      return response(listing(Number(query.get('page')), Number(query.get('limit')), 35))
    })
    render(<PastesTable />)

    expect(await screen.findByText('第 1–15 条，共 35 条')).toBeInTheDocument()
    const pageSize = screen.getByRole('combobox', { name: '每页条数' })
    expect(pageSize).toHaveTextContent('15')
    expect(screen.getByRole('button', { name: '第 1 页' })).toBeDisabled()
    fireEvent.keyDown(pageSize, { key: 'ArrowDown' })
    fireEvent.keyDown(await screen.findByRole('option', { name: '20' }), { key: 'Enter' })

    expect(await screen.findByText('第 1–20 条，共 35 条')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenLastCalledWith('/api/admin/pastes?page=1&limit=20', expect.objectContaining({ signal: expect.any(AbortSignal) }))
  })

  it('删除末页唯一记录后回到前页，并保持分页可用', async () => {
    let total = 16
    fetchMock.mockImplementation(async (url, options) => {
      if (options?.method === 'DELETE') {
        total = 15
        return response({ message: '已删除' })
      }
      const query = new URL(String(url), 'http://localhost').searchParams
      return response(listing(Number(query.get('page')), Number(query.get('limit')), total))
    })
    render(<PastesTable />)
    await screen.findByText('paste-1')
    fireEvent.click(screen.getByRole('button', { name: '下一页' }))
    await screen.findByText('paste-16')
    fireEvent.click(screen.getByRole('button', { name: '删除 paste-16' }))
    fireEvent.click(await screen.findByRole('button', { name: '删除' }))

    expect(await screen.findByText('第 1–15 条，共 15 条')).toBeInTheDocument()
    expect(screen.getByText('paste-1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '上一页' })).toBeDisabled()
    expect(screen.queryByText('暂无分享记录')).not.toBeInTheDocument()
  })

  it('新页请求成功后，不让已取消的旧页响应覆盖它', async () => {
    let resolveOld: (value: Response) => void = () => {}
    let oldSignal: AbortSignal | undefined
    fetchMock.mockImplementation(async (url, options) => {
      const query = new URL(String(url), 'http://localhost').searchParams
      const page = Number(query.get('page'))
      if (page === 2) {
        oldSignal = options?.signal ?? undefined
        return new Promise<Response>((resolve) => { resolveOld = resolve })
      }
      return response(listing(page, 15, 45))
    })
    render(<PastesTable />)
    await screen.findByText('paste-1')
    fireEvent.click(screen.getByRole('button', { name: '第 2 页' }))
    await waitFor(() => expect(oldSignal).toBeDefined())
    fireEvent.click(screen.getByRole('button', { name: '第 3 页' }))
    await screen.findByText('paste-31')
    await act(async () => { resolveOld(response(listing(2, 15, 45))) })

    expect(oldSignal?.aborted).toBe(true)
    expect(screen.getByText('paste-31')).toBeInTheDocument()
    expect(screen.queryByText('paste-16')).not.toBeInTheDocument()
  })

  it('请求失败后结束加载，并允许重新请求', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(response(listing(1, 15, 1)))
    render(<PastesTable />)
    expect(await screen.findByRole('alert')).toHaveTextContent('无法加载分享记录')
    fireEvent.click(screen.getByRole('button', { name: '重试' }))
    expect(await screen.findByText('paste-1')).toBeInTheDocument()
  })

  it('服务端收回超出范围的页码后，仍能翻到再次出现的下一页', async () => {
    let pageTwoRequests = 0
    fetchMock.mockImplementation(async (url) => {
      const page = Number(new URL(String(url), 'http://localhost').searchParams.get('page'))
      if (page === 2 && ++pageTwoRequests === 1) {
        // A concurrent deletion removes page two; later creations restore it.
        return response(listing(1, 15, 15))
      }
      return response(listing(page, 15, 30))
    })
    render(<PastesTable />)
    await screen.findByText('paste-1')
    fireEvent.click(screen.getByRole('button', { name: '下一页' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))
    await screen.findByText('第 1–15 条，共 30 条')
    fireEvent.click(screen.getByRole('button', { name: '下一页' }))

    expect(await screen.findByText('paste-16')).toBeInTheDocument()
    expect(pageTwoRequests).toBe(2)
  })

  it('空列表正确显示零条，并保留有效页码', async () => {
    fetchMock.mockResolvedValueOnce(response(listing(1, 15, 0)))
    render(<PastesTable />)
    expect(await screen.findByText('暂无分享记录')).toBeInTheDocument()
    expect(screen.getByText('第 0–0 条，共 0 条')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '下一页' })).toBeDisabled()
  })
})
