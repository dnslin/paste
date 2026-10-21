import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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
  it('编号单元格同时提供时间和完整状态，便于窄屏直接核对并操作', async () => {
    const data = listing(1, 15, 1)
    data.items[0].status = 'destroyed'
    fetchMock.mockResolvedValue(response(data))
    render(<PastesTable />)
    const id = await screen.findByText('paste-1')
    const row = id.closest('tr')!
    const identifier = within(row).getAllByRole('cell')[0]
    expect(identifier).toHaveTextContent(new Date(data.items[0].createdAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }))
    expect(identifier).toHaveTextContent('查看次数已用尽')
    expect(within(row).getByRole('button', { name: '查看 paste-1' })).toBeEnabled()
    expect(within(row).getByRole('button', { name: '删除 paste-1' })).toBeEnabled()
  })

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

  it('应用组合筛选回到首页，每页数和分页请求保留条件，草稿不发请求', async () => {
    fetchMock.mockImplementation(async (url) => {
      const query = new URL(String(url), 'http://localhost').searchParams
      return response(listing(Number(query.get('page')), Number(query.get('limit')), 35))
    })
    render(<PastesTable />)
    await screen.findByText('paste-1')
    fireEvent.click(screen.getByRole('button', { name: '下一页' }))
    await screen.findByText('paste-16')
    const requestCount = fetchMock.mock.calls.length
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: ' AbC ' } })
    fireEvent.change(screen.getByLabelText('状态'), { target: { value: 'expired' } })
    fireEvent.change(screen.getByLabelText('创建开始日期'), { target: { value: '2026-10-21' } })
    expect(fetchMock).toHaveBeenCalledTimes(requestCount)
    fireEvent.submit(screen.getByRole('search'))
    await screen.findByText('paste-1')
    let query = new URL(String(fetchMock.mock.calls.at(-1)![0]), 'http://localhost').searchParams
    expect(Object.fromEntries(query)).toEqual({ page: '1', limit: '15', q: 'AbC', status: 'expired', createdFrom: '2026-10-20T16:00:00.000Z' })
    fireEvent.click(screen.getByRole('button', { name: '下一页' }))
    await screen.findByText('paste-16')
    query = new URL(String(fetchMock.mock.calls.at(-1)![0]), 'http://localhost').searchParams
    expect(query.get('q')).toBe('AbC')
    expect(query.get('page')).toBe('2')
    fireEvent.keyDown(screen.getByRole('combobox', { name: '每页条数' }), { key: 'ArrowDown' })
    fireEvent.keyDown(await screen.findByRole('option', { name: '20' }), { key: 'Enter' })
    await screen.findByText('第 1–20 条，共 35 条')
    fireEvent.click(screen.getByRole('button', { name: '重置' }))
    await waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith('/api/admin/pastes?page=1&limit=20', expect.any(Object)))
  })

  it('筛选请求失败保留表单与草稿，重试仍查询生效条件且不把旧结果计为新结果', async () => {
    let resolveQuery: (value: Response) => void = () => {}
    fetchMock.mockResolvedValueOnce(response(listing(1, 15, 1)))
      .mockImplementationOnce(() => new Promise<Response>(resolve => { resolveQuery = resolve }))
      .mockResolvedValueOnce(response({ ...listing(1, 15, 1), items: [{ ...listing(1, 15, 1).items[0], id: 'AbC' }] }))
    render(<PastesTable />)
    await screen.findByText('paste-1')
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'AbC' } })
    fireEvent.submit(screen.getByRole('search'))
    expect(screen.queryByText('paste-1')).not.toBeInTheDocument()
    expect(screen.queryByText('找到 1 条')).not.toBeInTheDocument()
    await act(async () => resolveQuery(Response.json({ success: false, error: { message: '查询暂时不可用' } }, { status: 500 })))
    expect(await screen.findByRole('alert')).toHaveTextContent('查询暂时不可用')
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '尚未提交' } })
    fireEvent.click(screen.getByRole('button', { name: '重试' }))
    await screen.findByText('AbC')
    expect(screen.getByRole('searchbox')).toHaveValue('尚未提交')
    expect(new URL(String(fetchMock.mock.calls.at(-1)![0]), 'http://localhost').searchParams.get('q')).toBe('AbC')
  })

  it('空筛选结果可清空恢复，无筛选仍展示暂无分享记录', async () => {
    fetchMock.mockResolvedValueOnce(response(listing(1, 15, 1))).mockResolvedValueOnce(response(listing(1, 15, 0))).mockResolvedValueOnce(response(listing(1, 15, 1)))
    render(<PastesTable />)
    await screen.findByText('paste-1')
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'missing' } })
    fireEvent.submit(screen.getByRole('search'))
    expect(await screen.findByText('没有匹配的分享')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: '清空筛选' }))
    expect(await screen.findByText('paste-1')).toBeVisible()
  })
})
