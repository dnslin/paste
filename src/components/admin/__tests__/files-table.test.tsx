import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FilesTable } from '../files-table'
import type { AdminFilesResponse } from '@/lib/admin/file-contract'

const fetchMock = vi.fn<typeof fetch>()
const initial: AdminFilesResponse = {
  items: [{ id: 'abc123', fileName: '交付说明.md', size: 1024, createdAt: '2026-10-17T01:00:00Z', expiresAt: '2026-10-18T01:00:00Z', downloadsRemaining: 3, hasPassword: true, status: 'active', cleanupStatus: 'active' }],
  total: 1, page: 1, totalPages: 1, pageSize: 15,
  storage: { usedBytes: 1052, reservedBytes: 0, limitBytes: 1024 * 1024 * 1024 },
}
const response = (data: unknown) => Response.json({ success: true, data })

beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock) })
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('后台文件列表', () => {
  it('加载错误可重试，详情直接显示记录且不会下载文件', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ success: false, error: { message: '暂时不可用' } }, { status: 500 })).mockResolvedValue(response(initial))
    render(<FilesTable />)
    expect(await screen.findByRole('alert')).toHaveTextContent('暂时不可用')
    fireEvent.click(screen.getByRole('button', { name: '重试' }))
    fireEvent.click(await screen.findByRole('button', { name: '查看 交付说明.md' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('剩余 3 次下载')
    expect(screen.getByRole('link', { name: '查看分享页面' })).toHaveAttribute('href', '/f/abc123')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('取消不删除；删除失败保留记录及明确反馈，允许重试', async () => {
    fetchMock.mockResolvedValue(response(initial))
    render(<FilesTable />)
    fireEvent.click(await screen.findByRole('button', { name: '删除 交付说明.md' }))
    fireEvent.click(screen.getByRole('button', { name: '取消' }))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: '删除 交付说明.md' }))
    fetchMock.mockResolvedValueOnce(Response.json({ success: false, error: { message: '已停止访问，文件清理失败，请重试' } }, { status: 500 }))
    fireEvent.click(screen.getByRole('button', { name: '确认删除' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('清理失败')
    expect(screen.queryByText('已删除 交付说明.md')).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: '确认删除' })).toBeEnabled())
    fetchMock.mockResolvedValueOnce(response({ id: 'abc123' })).mockResolvedValue(response({ ...initial, items: [], total: 0, storage: { ...initial.storage, usedBytes: 0 } }))
    fireEvent.click(screen.getByRole('button', { name: '确认删除' }))
    expect(await screen.findByText('已删除 交付说明.md')).toBeInTheDocument()
    expect(await screen.findByText('暂无文件分享')).toBeInTheDocument()
  })

  it('清理显示失败数量，并重新获取实际占用', async () => {
    fetchMock.mockResolvedValueOnce(response(initial)).mockResolvedValueOnce(response({ removed: 1, failed: 0, orphansRemoved: 1, orphansFailed: 1 }))
      .mockResolvedValue(response({ ...initial, storage: { ...initial.storage, usedBytes: 0 } }))
    render(<FilesTable />)
    await screen.findByRole('button', { name: '删除 交付说明.md' })
    fireEvent.click(screen.getByRole('button', { name: '清理失效文件' }))
    expect(await screen.findByText('已清理 2 个，1 个等待重试')).toBeInTheDocument()
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))
    expect(fetchMock.mock.calls[1]).toEqual(['/api/admin/files/cleanup', { method: 'POST' }])
    expect(await screen.findByText('0 B')).toBeInTheDocument()
  })
})
