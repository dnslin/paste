import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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
  it('文件单元格同时提供编号、大小和完整清理状态，长名称仍关联正确操作', async () => {
    const fileName = `${'交付说明'.repeat(12)}.md`
    fetchMock.mockResolvedValue(response({ ...initial, items: [{ ...initial.items[0], fileName, cleanupStatus: 'delete_failed' }] }))
    render(<FilesTable />)
    const file = await screen.findByText(fileName)
    const row = file.closest('tr')!
    const identifier = within(row).getAllByRole('cell')[0]
    expect(identifier).toHaveTextContent('abc123')
    expect(identifier).toHaveTextContent('1.0 KiB')
    expect(identifier).toHaveTextContent('清理失败，等待重试')
    expect(within(row).getByRole('button', { name: `查看 ${fileName}` })).toBeEnabled()
    expect(within(row).getByRole('button', { name: `删除 ${fileName}` })).toBeEnabled()
  })

  it('已有记录刷新和翻页时保留列表，并明确显示更新状态', async () => {
    let resolveRequest: (value: Response) => void = () => {}
    fetchMock.mockResolvedValueOnce(response({ ...initial, total: 30, totalPages: 2 }))
      .mockImplementation(() => new Promise<Response>((resolve) => { resolveRequest = resolve }))
    render(<FilesTable />)
    await screen.findByText('交付说明.md')
    fireEvent.click(screen.getByRole('button', { name: '刷新文件记录' }))
    expect(screen.getByText('正在更新文件记录…')).toBeVisible()
    expect(screen.getByText('交付说明.md')).toBeVisible()
    expect(screen.getByRole('button', { name: '查看 交付说明.md' })).toBeDisabled()
    await act(async () => resolveRequest(response({ ...initial, total: 30, totalPages: 2 })))
    expect(screen.queryByText('正在更新文件记录…')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '下一页' }))
    expect(screen.getByText('正在更新文件记录…')).toBeVisible()
    expect(screen.getByText('交付说明.md')).toBeVisible()
    await act(async () => resolveRequest(response({ ...initial, page: 2, total: 30, totalPages: 2 })))
    expect(screen.queryByText('正在更新文件记录…')).not.toBeInTheDocument()
    expect(screen.getByText('第 16–30 条，共 30 条')).toBeInTheDocument()
  })

  it('清理期间显示明确状态，完成后恢复操作并显示结果', async () => {
    let resolveCleanup: (value: Response) => void = () => {}
    fetchMock.mockResolvedValueOnce(response(initial))
      .mockImplementationOnce(() => new Promise<Response>((resolve) => { resolveCleanup = resolve }))
      .mockResolvedValue(response(initial))
    render(<FilesTable />)
    await screen.findByText('交付说明.md')
    fireEvent.click(screen.getByRole('button', { name: '清理失效文件' }))
    expect(screen.getByRole('button', { name: '正在清理…' })).toBeDisabled()
    expect(screen.getByText('交付说明.md')).toBeVisible()
    await act(async () => resolveCleanup(response({ removed: 1, failed: 0, orphansRemoved: 0, orphansFailed: 0 })))
    expect(await screen.findByText('已清理 1 个文件')).toBeVisible()
    await waitFor(() => expect(screen.getByRole('button', { name: '清理失效文件' })).toBeEnabled())
  })

  it('清理失败后保留错误与原记录，重新获取占用不会掩盖失败', async () => {
    fetchMock.mockResolvedValueOnce(response(initial))
      .mockResolvedValueOnce(Response.json({ success: false, error: { message: '存储暂时不可用，清理失败' } }, { status: 500 }))
      .mockResolvedValue(response(initial))
    render(<FilesTable />)
    await screen.findByText('交付说明.md')
    fireEvent.click(screen.getByRole('button', { name: '清理失效文件' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('存储暂时不可用，清理失败')
    await waitFor(() => expect(screen.getByRole('button', { name: '清理失效文件' })).toBeEnabled())
    expect(screen.getByText('交付说明.md')).toBeVisible()
    expect(screen.getByRole('alert')).toHaveTextContent('存储暂时不可用，清理失败')
    expect(screen.queryByText('正在更新文件记录…')).not.toBeInTheDocument()
    expect(screen.queryByText(/已清理/)).not.toBeInTheDocument()
  })

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
