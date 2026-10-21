import { Blob as NodeBlob } from 'node:buffer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { PasteViewer } from '../paste-viewer'

vi.mock('@/lib/highlight', () => ({ plainCodeHtml: (code: string) => `<pre>${code}</pre>`, highlightCode: async (code: string) => `<pre>${code}</pre>` }))
const fetchMock = vi.fn()
const createObjectURL = vi.fn<(blob: Blob) => string>(() => 'blob:paste-original')
const revokeObjectURL = vi.fn()
let downloads: string[]
const props = { pasteId: 'abc123', initialStatus: 'active' as const, hasPassword: false, language: 'plaintext', burnCount: 1 }

beforeEach(() => {
  downloads = []
  fetchMock.mockReset()
  createObjectURL.mockClear()
  revokeObjectURL.mockClear()
  vi.stubGlobal('fetch', fetchMock)
  vi.stubGlobal('Blob', NodeBlob)
  vi.stubGlobal('URL', class extends URL {
    static createObjectURL = createObjectURL
    static revokeObjectURL = revokeObjectURL
  })
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    downloads.push(this.download)
  })
})
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('查看内容', () => {
  it('有次数限制时先领取，最后一次也可重复下载原文且不再请求领取', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ success: true, data: { content: '受限正文', language: 'sql', remainingViews: 0 } }) })
    render(<PasteViewer {...props} />)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: '下载原文' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '查看内容' }))
    expect(await screen.findByText('受限正文')).toBeInTheDocument()
    expect(screen.getByText('这是最后一次查看，当前页面仍可阅读、复制和下载。')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '下载原文' }))
    fireEvent.click(screen.getByRole('button', { name: '下载原文' }))
    expect(downloads).toEqual(['paste-abc123.sql', 'paste-abc123.sql'])
    expect(await createObjectURL.mock.calls[0][0].text()).toBe('受限正文')
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledWith('/api/pastes/abc123/verify', expect.objectContaining({ method: 'POST', body: '{}' }))
    expect(screen.queryByRole('button', { name: '查看内容' })).not.toBeInTheDocument()
  })

  it('密码错误和429后允许再次尝试，不把锁定写成永久禁用', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({ success: false, error: { code: 'RATE_LIMITED', message: '稍后重试' } }) }).mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: { content: '已解锁正文', language: 'javascript', remainingViews: 2 } }) })
    render(<PasteViewer {...props} hasPassword burnCount={3} />)
    fireEvent.change(screen.getByLabelText('访问密码'), { target: { value: 'password' } })
    fireEvent.click(screen.getByRole('button', { name: '解锁内容' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('稍后重试')
    expect(screen.queryByRole('button', { name: '下载原文' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '解锁内容' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: '解锁内容' }))
    expect(await screen.findByText('已解锁正文')).toBeInTheDocument()
    expect(screen.getByText(/还可查看 2 次/)).toBeInTheDocument()
    expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify({ password: 'password' }))
  })

  it('领取网络失败明确显示错误并允许重试', async () => {
    fetchMock.mockRejectedValue(new Error('offline'))
    render(<PasteViewer {...props} />)
    fireEvent.click(screen.getByRole('button', { name: '查看内容' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('检查网络连接')
    expect(screen.queryByRole('button', { name: '下载原文' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '查看内容' })).toBeEnabled()
  })

  it.each(['内容已过期', '查看次数已用完', '内容不存在'])('页面打开后领取返回404：%s，转为不可用且提示获取新链接', async (message) => {
    fetchMock.mockResolvedValue({ ok: false, status: 404, json: async () => ({ success: false, error: { code: 'NOT_FOUND', message } }) })
    render(<PasteViewer {...props} />)
    fireEvent.click(screen.getByRole('button', { name: '查看内容' }))
    expect(await screen.findByRole('heading', { name: '分享已失效' })).toBeInTheDocument()
    expect(screen.getByText('请联系分享者获取新链接。')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '查看内容' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '下载原文' })).not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('密码错误后保留输入，纠正密码后可以重试', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 400, json: async () => ({ success: false, error: { code: 'VALIDATION_ERROR', message: '密码不正确' } }) })
    render(<PasteViewer {...props} hasPassword />)
    fireEvent.change(screen.getByLabelText('访问密码'), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: '解锁内容' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('密码不正确')
    expect(screen.queryByRole('button', { name: '下载原文' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('访问密码')).toHaveValue('wrong')
    expect(screen.getByRole('button', { name: '解锁内容' })).toBeEnabled()
    expect(screen.queryByText('请联系分享者获取新链接。')).not.toBeInTheDocument()
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ success: true, data: { content: '纠正后正文', language: 'plaintext', remainingViews: 0 } }) })
    fireEvent.change(screen.getByLabelText('访问密码'), { target: { value: 'correct' } })
    fireEvent.click(screen.getByRole('button', { name: '解锁内容' }))
    expect(await screen.findByText('纠正后正文')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '下载原文' }))
    expect(downloads).toEqual(['paste-abc123.txt'])
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('无限次普通内容使用initialContent，无后台计数请求', async () => {
    render(<PasteViewer {...props} burnCount={null} initialContent="普通正文" />)
    expect(screen.getByText('普通正文')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: '长行换行' }))
    expect(screen.getByRole('checkbox', { name: '长行换行' })).toBeChecked()
    fireEvent.click(screen.getByRole('button', { name: '下载原文' }))
    expect(downloads).toEqual(['paste-abc123.txt'])
    expect(await createObjectURL.mock.calls[0][0].text()).toBe('普通正文')
    await waitFor(() => expect(fetchMock).not.toHaveBeenCalled())
  })

  it('领取响应尚未返回时没有正文或下载入口', async () => {
    let resolveResponse!: (response: unknown) => void
    fetchMock.mockReturnValue(new Promise((resolve) => { resolveResponse = resolve }))
    render(<PasteViewer {...props} />)
    fireEvent.click(screen.getByRole('button', { name: '查看内容' }))
    expect(screen.getByRole('button', { name: '正在读取…' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: '下载原文' })).not.toBeInTheDocument()
    expect(createObjectURL).not.toHaveBeenCalled()
    resolveResponse({ ok: true, json: async () => ({ success: true, data: { content: '领取完成', language: 'json', remainingViews: 0 } }) })
    expect(await screen.findByRole('button', { name: '下载原文' })).toBeEnabled()
  })

  it.each([
    ['not_found', '分享已失效'], ['expired', '内容已过期'], ['destroyed', '查看次数已用完'], ['error', '暂时无法读取内容'],
  ] as const)('%s具有准确提示和返回首页入口', (status, title) => {
    render(<PasteViewer {...props} initialStatus={status} />)
    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '返回首页' })).toHaveAttribute('href', '/')
    expect(screen.queryByRole('button', { name: '下载原文' })).not.toBeInTheDocument()
    if (status === 'error') {
      expect(screen.getByText(/刷新页面重试/)).toBeInTheDocument()
      expect(screen.queryByText('请联系分享者获取新链接。')).not.toBeInTheDocument()
    } else {
      expect(screen.getByText('请联系分享者获取新链接。')).toBeInTheDocument()
    }
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
