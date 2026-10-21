import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ShareManagementMetadata } from '@/lib/share-management-contract'
import { ShareManagement } from '../share-management'

const fetchMock = vi.fn<typeof fetch>()
const textShare: ShareManagementMetadata = {
  kind: 'text', id: 'example', language: 'javascript', status: 'active',
  createdAt: '2026-10-21T00:00:00.000Z', expiresAt: null, remaining: 1, hasPassword: false,
}
const fileShare: ShareManagementMetadata = {
  ...textShare, kind: 'file', fileName: '项目交付说明与接口文档.zip', hasPassword: true, remaining: 3,
}
const ok = (data: unknown) => new Response(JSON.stringify({ success: true, data }), { status: 200 })
const failure = (status: number) => new Response(JSON.stringify({ success: false, error: { code: status === 404 ? 'MANAGEMENT_UNAVAILABLE' : 'INTERNAL_ERROR', message: '无法读取管理状态' } }), { status })

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}

beforeEach(() => {
  window.history.replaceState(null, '', '/manage/text/example#private-key')
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

async function openConfirmation() {
  fireEvent.click(await screen.findByRole('button', { name: '撤销分享' }))
  return screen.findByRole('dialog', { name: '撤销这次分享？' })
}

describe('私人分享管理', () => {
  it('仅用管理凭证读取文本摘要，不领取正文或消耗次数', async () => {
    fetchMock.mockResolvedValueOnce(ok(textShare))
    render(<ShareManagement kind="text" shareId="example" />)
    expect(await screen.findByText('JavaScript')).toBeInTheDocument()
    expect(screen.getByText('剩余 1 次查看机会')).toBeInTheDocument()
    expect(screen.getByText('永不过期')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /查看内容|下载文件/ })).not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith('/api/manage/text/example', expect.objectContaining({
      cache: 'no-store', headers: { Authorization: 'Bearer private-key' },
    }))
  })

  it('文件摘要显示文件名和保护规则，但不提供下载或密码输入', async () => {
    fetchMock.mockResolvedValueOnce(ok(fileShare))
    render(<ShareManagement kind="file" shareId="example" />)
    expect(await screen.findByText(fileShare.fileName)).toBeInTheDocument()
    expect(screen.getByText('剩余 3 次下载机会')).toBeInTheDocument()
    expect(screen.getByText('密码保护')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /下载/ })).not.toBeInTheDocument()
  })

  it.each(['missing', 'kind'] as const)('%s 无完整管理链接时不请求摘要', async (invalid) => {
    if (invalid === 'missing') window.history.replaceState(null, '', '/manage/text/example')
    render(<ShareManagement kind={invalid === 'kind' ? null : 'text'} shareId="example" />)
    expect(await screen.findByRole('heading', { name: '管理链接无效或分享已失效' })).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.queryByText('JavaScript')).not.toBeInTheDocument()
  })

  it('错误凭证或已删除记录的 404 不泄漏摘要', async () => {
    fetchMock.mockResolvedValueOnce(failure(404))
    render(<ShareManagement kind="text" shareId="example" />)
    expect(await screen.findByRole('heading', { name: '管理链接无效或分享已失效' })).toBeInTheDocument()
    expect(screen.queryByText('JavaScript')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '撤销分享' })).not.toBeInTheDocument()
  })

  it('管理加载失败保留重试，成功后才允许撤销', async () => {
    fetchMock.mockResolvedValueOnce(failure(500)).mockResolvedValueOnce(ok(textShare))
    render(<ShareManagement kind="text" shareId="example" />)
    expect(await screen.findByRole('heading', { name: '暂时无法加载分享状态' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '撤销分享' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '重新加载' }))
    expect(await screen.findByRole('button', { name: '撤销分享' })).toBeInTheDocument()
    expect(console.error).toHaveBeenCalled()
  })

  it('确认默认聚焦继续分享，取消和 Escape 都返回入口且不撤销', async () => {
    fetchMock.mockResolvedValueOnce(ok(textShare))
    render(<ShareManagement kind="text" shareId="example" />)
    const dialog = await openConfirmation()
    expect(within(dialog).getByRole('button', { name: '继续分享' })).toHaveFocus()
    fireEvent.click(within(dialog).getByRole('button', { name: '继续分享' }))
    await waitFor(() => expect(screen.getByRole('button', { name: '撤销分享' })).toHaveFocus())
    await openConfirmation()
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(screen.getByRole('button', { name: '撤销分享' })).toHaveFocus())
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('等待确认成功才显示已撤销，处理期间防止重复请求并聚焦结果', async () => {
    const pending = deferred<Response>()
    fetchMock.mockResolvedValueOnce(ok(fileShare)).mockReturnValueOnce(pending.promise)
    render(<ShareManagement kind="file" shareId="example" />)
    await openConfirmation()
    fireEvent.click(screen.getByRole('button', { name: '确认撤销' }))
    expect(screen.getByRole('button', { name: '正在撤销…' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: '正在撤销…' }))
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('heading', { name: '分享已撤销' })).not.toBeInTheDocument()
    await act(async () => { pending.resolve(ok({ revoked: true })) })
    expect(await screen.findByRole('heading', { name: '分享已撤销' })).toHaveFocus()
    expect(screen.queryByRole('button', { name: '撤销分享' })).not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenLastCalledWith('/api/manage/file/example', expect.objectContaining({
      method: 'DELETE', cache: 'no-store', headers: { Authorization: 'Bearer private-key' },
    }))
  })

  it('撤销结果不确定时，重试先重新读取当前状态再执行删除', async () => {
    fetchMock.mockResolvedValueOnce(ok(textShare)).mockRejectedValueOnce(new Error('connection lost'))
      .mockResolvedValueOnce(ok(textShare)).mockResolvedValueOnce(ok({ revoked: true }))
    render(<ShareManagement kind="text" shareId="example" />)
    await openConfirmation()
    fireEvent.click(screen.getByRole('button', { name: '确认撤销' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('暂时无法确认撤销结果')
    expect(screen.queryByRole('heading', { name: '分享已撤销' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '重试撤销' }))
    expect(await screen.findByRole('heading', { name: '分享已撤销' })).toBeInTheDocument()
    expect(fetchMock.mock.calls.map(([, options]) => options?.method ?? 'GET')).toEqual(['GET', 'DELETE', 'GET', 'DELETE'])
  })

  it('响应丢失后重新读取为 404 时只显示失效，不伪称已撤销或再删除', async () => {
    fetchMock.mockResolvedValueOnce(ok(textShare)).mockRejectedValueOnce(new Error('connection lost')).mockResolvedValueOnce(failure(404))
    render(<ShareManagement kind="text" shareId="example" />)
    await openConfirmation()
    fireEvent.click(screen.getByRole('button', { name: '确认撤销' }))
    await screen.findByRole('alert')
    fireEvent.click(screen.getByRole('button', { name: '重试撤销' }))
    expect(await screen.findByRole('heading', { name: '管理链接无效或分享已失效' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '分享已撤销' })).not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('重新读取状态失败时不继续删除，直到确认分享仍可撤销', async () => {
    fetchMock.mockResolvedValueOnce(ok(textShare)).mockResolvedValueOnce(failure(500))
      .mockResolvedValueOnce(failure(500)).mockResolvedValueOnce(ok({ ...textShare, status: 'expired', expiresAt: '2026-10-20T00:00:00.000Z' }))
    render(<ShareManagement kind="text" shareId="example" />)
    await openConfirmation()
    fireEvent.click(screen.getByRole('button', { name: '确认撤销' }))
    await screen.findByRole('alert')
    fireEvent.click(screen.getByRole('button', { name: '重试撤销' }))
    await waitFor(() => expect(screen.getByRole('button', { name: '重试撤销' })).not.toBeDisabled())
    expect(fetchMock.mock.calls.map(([, options]) => options?.method ?? 'GET')).toEqual(['GET', 'DELETE', 'GET'])
    expect(screen.queryByRole('heading', { name: '分享已撤销' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '重试撤销' }))
    expect(await screen.findByText('分享已结束，无需再撤销。')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(screen.queryByRole('button', { name: '撤销分享' })).not.toBeInTheDocument()
  })

  it.each(['expired', 'exhausted'] as const)('%s 已结束的分享不再提供撤销', async (status) => {
    fetchMock.mockResolvedValueOnce(ok({ ...textShare, status, remaining: status === 'exhausted' ? 0 : 1 }))
    render(<ShareManagement kind="text" shareId="example" />)
    expect(await screen.findByText('分享已结束，无需再撤销。')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '撤销分享' })).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('片段凭证改变后，旧请求的迟到摘要不能覆盖新结果', async () => {
    const oldRequest = deferred<Response>()
    fetchMock.mockReturnValueOnce(oldRequest.promise).mockResolvedValueOnce(failure(404))
    render(<ShareManagement kind="text" shareId="example" />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    act(() => {
      window.history.replaceState(null, '', '/manage/text/example#wrong-key')
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    expect(await screen.findByRole('heading', { name: '管理链接无效或分享已失效' })).toBeInTheDocument()
    await act(async () => { oldRequest.resolve(ok(textShare)) })
    expect(screen.queryByText('JavaScript')).not.toBeInTheDocument()
    expect(fetchMock.mock.calls[1][1]?.headers).toEqual({ Authorization: 'Bearer wrong-key' })
  })

  it('撤销途中移除凭证，迟到成功不会覆盖无效管理页', async () => {
    const deletion = deferred<Response>()
    fetchMock.mockResolvedValueOnce(ok(textShare)).mockReturnValueOnce(deletion.promise)
    render(<ShareManagement kind="text" shareId="example" />)
    await openConfirmation()
    fireEvent.click(screen.getByRole('button', { name: '确认撤销' }))
    act(() => {
      window.history.replaceState(null, '', '/manage/text/example')
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    expect(await screen.findByRole('heading', { name: '管理链接无效或分享已失效' })).toBeInTheDocument()
    await act(async () => { deletion.resolve(ok({ revoked: true })) })
    expect(screen.queryByRole('heading', { name: '分享已撤销' })).not.toBeInTheDocument()
  })
})
