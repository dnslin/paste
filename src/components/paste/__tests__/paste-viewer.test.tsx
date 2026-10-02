import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { PasteViewer } from '../paste-viewer'

vi.mock('@/lib/highlight', () => ({ plainCodeHtml: (code: string) => `<pre>${code}</pre>`, highlightCode: async (code: string) => `<pre>${code}</pre>` }))
const fetchMock = vi.fn()
const props = { pasteId: 'abc123', initialStatus: 'active' as const, hasPassword: false, language: 'plaintext', burnCount: 1 }

beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock) })

describe('查看内容', () => {
  it('有次数限制时不自动请求，点击才领取并显示最后一次提示', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ success: true, data: { content: '受限正文', language: 'plaintext', remainingViews: 0 } }) })
    render(<PasteViewer {...props} />)
    expect(fetchMock).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '查看内容' }))
    expect(await screen.findByText('受限正文')).toBeInTheDocument()
    expect(screen.getByText(/这是最后一次查看/)).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/pastes/abc123/verify', expect.objectContaining({ method: 'POST', body: '{}' }))
    expect(screen.queryByRole('button', { name: '查看内容' })).not.toBeInTheDocument()
  })

  it('密码错误和429后允许再次尝试，不把锁定写成永久禁用', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({ success: false, error: { code: 'RATE_LIMITED', message: '稍后重试' } }) }).mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: { content: '已解锁正文', language: 'javascript', remainingViews: 2 } }) })
    render(<PasteViewer {...props} hasPassword burnCount={3} />)
    fireEvent.change(screen.getByLabelText('访问密码'), { target: { value: 'password' } })
    fireEvent.click(screen.getByRole('button', { name: '解锁内容' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('稍后重试')
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
    expect(screen.getByRole('button', { name: '查看内容' })).toBeEnabled()
  })

  it('无限次普通内容使用initialContent，无后台计数请求', async () => {
    render(<PasteViewer {...props} burnCount={null} initialContent="普通正文" />)
    expect(screen.getByText('普通正文')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: '长行换行' }))
    expect(screen.getByRole('checkbox', { name: '长行换行' })).toBeChecked()
    await waitFor(() => expect(fetchMock).not.toHaveBeenCalled())
  })

  it.each([
    ['not_found', '内容不存在'], ['expired', '内容已过期'], ['destroyed', '查看次数已用完'], ['error', '暂时无法读取内容'],
  ] as const)('%s具有准确提示和返回首页入口', (status, title) => {
    render(<PasteViewer {...props} initialStatus={status} />)
    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '返回首页' })).toHaveAttribute('href', '/')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
