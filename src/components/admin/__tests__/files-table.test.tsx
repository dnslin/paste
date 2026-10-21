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
    expect(identifier).toHaveTextContent(new Date(initial.items[0].createdAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }))
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

  it('文件名、清理状态和日期组合查询，刷新与清理保留条件，全局占用不随匹配数改变', async () => {
    fetchMock.mockImplementation(async () => response(initial))
    render(<FilesTable />)
    await screen.findByText('交付说明.md')
    const count = fetchMock.mock.calls.length
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: ' 交付_100% ' } })
    fireEvent.change(screen.getByLabelText('状态'), { target: { value: 'delete_failed' } })
    fireEvent.change(screen.getByLabelText('创建结束日期'), { target: { value: '2026-10-21' } })
    expect(fetchMock).toHaveBeenCalledTimes(count)
    fireEvent.submit(screen.getByRole('search'))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(count + 1))
    await screen.findByRole('button', { name: '查看 交付说明.md' })
    const query = new URL(String(fetchMock.mock.calls.at(-1)![0]), 'http://localhost').searchParams
    expect(Object.fromEntries(query)).toEqual({ page: '1', limit: '15', q: '交付_100%', status: 'delete_failed', createdBefore: '2026-10-21T16:00:00.000Z' })
    expect(screen.queryByText('文件数量')).not.toBeInTheDocument()
    expect(screen.getByText('找到 1 条')).toBeVisible()
    expect(screen.getByText('1.0 KiB', { selector: 'p.font-mono' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: '刷新文件记录' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(count + 2))
    await screen.findByRole('button', { name: '查看 交付说明.md' })
    expect(new URL(String(fetchMock.mock.calls.at(-1)![0]), 'http://localhost').searchParams.get('q')).toBe('交付_100%')
    fetchMock.mockResolvedValueOnce(response({ removed: 0, failed: 0, orphansRemoved: 0, orphansFailed: 0 }))
    fireEvent.click(screen.getByRole('button', { name: '清理失效文件' }))
    await screen.findByText('已清理 0 个文件')
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(count + 4))
    expect(new URL(String(fetchMock.mock.calls.at(-1)![0]), 'http://localhost').searchParams.get('status')).toBe('delete_failed')
  })

  it('新筛选不会显示旧记录，重试保留条件，空结果可清空恢复', async () => {
    let resolveFirst: (value: Response) => void = () => {}
    fetchMock.mockResolvedValueOnce(response(initial))
      .mockImplementationOnce(() => new Promise<Response>(resolve => { resolveFirst = resolve }))
      .mockResolvedValueOnce(response({ ...initial, items: [], total: 0 }))
      .mockResolvedValue(response(initial))
    render(<FilesTable />)
    await screen.findByText('交付说明.md')
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'no-match' } })
    fireEvent.submit(screen.getByRole('search'))
    expect(screen.queryByText('交付说明.md')).not.toBeInTheDocument()
    const signal = fetchMock.mock.calls[1][1]?.signal
    await act(async () => resolveFirst(Response.json({ success: false, error: { message: '暂时失败' } }, { status: 500 })))
    fireEvent.click(await screen.findByRole('button', { name: '重试' }))
    expect(await screen.findByText('没有匹配的分享')).toBeVisible()
    expect(signal?.aborted).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: '清空筛选' }))
    expect(await screen.findByText('交付说明.md')).toBeVisible()
  })
})
