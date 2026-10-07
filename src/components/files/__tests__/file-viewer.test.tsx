import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { FileViewer } from '../file-viewer'

const fetchMock = vi.fn<typeof fetch>()
const key = 'A'.repeat(43)
const metadata = { fileName: 'private-report.pdf', size: 1024, expiresAt: '2027-01-01T00:00:00Z', burnCount: 1 }
const grant = { expiresAt: '2027-01-01T00:00:00Z', remainingDownloads: 0 }
const ok = (data: unknown) => Response.json({ success: true, data })
const fail = (code: string, status = 403) => Response.json({ success: false, error: { code, message: code } }, { status })

beforeEach(() => {
  fetchMock.mockReset()
  sessionStorage.clear()
  vi.stubGlobal('fetch', fetchMock)
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:test-file') })
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

async function unlock() {
  fireEvent.change(screen.getByLabelText('访问密码'), { target: { value: 'secret' } })
  fireEvent.click(screen.getByRole('button', { name: '验证密码' }))
  await screen.findByText(metadata.fileName)
}

describe('文件领取与重试', () => {
  it('密码验证前不显示元数据、不自动领取；验证只取元数据', async () => {
    fetchMock.mockResolvedValueOnce(ok(metadata))
    render(<FileViewer pasteId="file-one" initialStatus="active" hasPassword burnCount={1} />)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.queryByText(metadata.fileName)).not.toBeInTheDocument()
    await unlock()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/files/file-one/verify')
    expect(sessionStorage.length).toBe(0)
  })

  it('领取后下载使用 Authorization，断网重试沿用同一键且不存密码', async () => {
    fetchMock.mockResolvedValueOnce(ok(metadata)).mockResolvedValueOnce(ok(grant)).mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(ok(grant)).mockResolvedValueOnce(new Response(new Blob(['file'])))
    render(<FileViewer pasteId="file-one" initialStatus="active" hasPassword burnCount={1} />)
    await unlock()
    fireEvent.click(screen.getByRole('button', { name: '下载文件' }))
    await screen.findByRole('alert')
    const stored = sessionStorage.getItem('paste:file-claim:file-one')
    expect(stored).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(JSON.stringify(sessionStorage)).not.toContain('secret')
    expect(fetchMock.mock.calls[2][1]?.headers).toEqual({ Authorization: `Bearer ${stored}` })
    fireEvent.click(screen.getByRole('button', { name: '重试下载文件' }))
    await screen.findByText(/文件已交给浏览器/)
    const claims = fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/claim'))
    expect(claims.map(([, options]) => JSON.parse(String(options?.body)).claimKey)).toEqual([stored, stored])
    expect(screen.queryByText('已保存')).not.toBeInTheDocument()
  })

  it('刷新后即使次数为零也允许用已有凭证重试，不要求再输密码', async () => {
    sessionStorage.setItem('paste:file-claim:file-one', key)
    fetchMock.mockResolvedValueOnce(ok(grant)).mockResolvedValueOnce(new Response(new Blob(['file'])))
    render(<FileViewer pasteId="file-one" initialStatus="destroyed" hasPassword burnCount={0} />)
    fireEvent.click(await screen.findByRole('button', { name: '重试下载文件' }))
    await screen.findByText(/文件已交给浏览器/)
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ claimKey: key })
    expect(fetchMock.mock.calls[1][0]).toBe('/api/files/file-one/download')
  })

  it('刷新保留了未到达服务器的领取键时，可以重新验证密码并沿用原键', async () => {
    sessionStorage.setItem('paste:file-claim:file-one', key)
    fetchMock.mockResolvedValueOnce(ok(metadata)).mockResolvedValueOnce(ok(grant)).mockResolvedValueOnce(new Response(new Blob(['file'])))
    render(<FileViewer pasteId="file-one" initialStatus="active" hasPassword burnCount={1} />)
    expect(await screen.findByRole('button', { name: '重试下载文件' })).toBeEnabled()
    await unlock()
    fireEvent.click(screen.getByRole('button', { name: '重试下载文件' }))
    await screen.findByText(/文件已交给浏览器/)
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({ password: 'secret', claimKey: key })
    expect(sessionStorage.getItem('paste:file-claim:file-one')).toBe(key)
  })

  it('过期凭证必须明确点击扣次提示才能换键', async () => {
    sessionStorage.setItem('paste:file-claim:file-one', key)
    fetchMock.mockResolvedValueOnce(fail('GRANT_EXPIRED', 410)).mockResolvedValueOnce(ok(grant)).mockResolvedValueOnce(new Response(new Blob(['file'])))
    render(<FileViewer pasteId="file-one" initialStatus="active" hasPassword={false} burnCount={2} />)
    fireEvent.click(await screen.findByRole('button', { name: '重试下载文件' }))
    await screen.findByRole('alert')
    expect(sessionStorage.getItem('paste:file-claim:file-one')).toBe(key)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: '重新领取并下载（扣 1 次）' }))
    await screen.findByText(/文件已交给浏览器/)
    expect(sessionStorage.getItem('paste:file-claim:file-one')).not.toBe(key)
  })

  it('换新凭证后的响应丢失仍沿用新键重试，不能再次扣次', async () => {
    sessionStorage.setItem('paste:file-claim:file-one', key)
    fetchMock.mockResolvedValueOnce(fail('GRANT_EXPIRED', 410)).mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(ok(grant)).mockResolvedValueOnce(new Response(new Blob(['file'])))
    render(<FileViewer pasteId="file-one" initialStatus="active" hasPassword={false} burnCount={2} />)
    fireEvent.click(await screen.findByRole('button', { name: '重试下载文件' }))
    await screen.findByRole('button', { name: '重新领取并下载（扣 1 次）' })
    fireEvent.click(screen.getByRole('button', { name: '重新领取并下载（扣 1 次）' }))
    await screen.findByText(/下载未完成/)
    const replacement = sessionStorage.getItem('paste:file-claim:file-one')
    expect(replacement).not.toBe(key)
    expect(screen.queryByRole('button', { name: /重新领取/ })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '重试下载文件' }))
    await screen.findByText(/文件已交给浏览器/)
    expect(sessionStorage.getItem('paste:file-claim:file-one')).toBe(replacement)
  })

  it('无效或撤销凭证不会换键重新扣次', async () => {
    sessionStorage.setItem('paste:file-claim:file-one', key)
    fetchMock.mockResolvedValueOnce(fail('INVALID_GRANT'))
    render(<FileViewer pasteId="file-one" initialStatus="active" hasPassword={false} burnCount={2} />)
    fireEvent.click(await screen.findByRole('button', { name: '重试下载文件' }))
    await screen.findByRole('alert')
    expect(screen.queryByRole('button', { name: /重新领取/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '重试下载文件' })).toBeDisabled()
    expect(sessionStorage.getItem('paste:file-claim:file-one')).toBe(key)
  })

  it('取消下载保留凭证并允许重试，不能显示保存成功', async () => {
    sessionStorage.setItem('paste:file-claim:file-one', key)
    fetchMock.mockImplementationOnce((_url, options) => new Promise((_resolve, reject) => {
      options?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
    }))
    render(<FileViewer pasteId="file-one" initialStatus="destroyed" hasPassword burnCount={0} />)
    fireEvent.click(await screen.findByRole('button', { name: '重试下载文件' }))
    fireEvent.click(screen.getByRole('button', { name: '取消下载' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('下载已取消')
    expect(sessionStorage.getItem('paste:file-claim:file-one')).toBe(key)
    expect(screen.getByRole('button', { name: '重试下载文件' })).toBeEnabled()
    expect(screen.queryByText(/文件已交给浏览器/)).not.toBeInTheDocument()
  })

  it('验证时次数已耗尽就不再展示新的领取按钮', async () => {
    fetchMock.mockResolvedValueOnce(ok({ ...metadata, burnCount: 0 }))
    render(<FileViewer pasteId="file-one" initialStatus="active" hasPassword burnCount={1} />)
    await unlock()
    expect(screen.getByText('下载领取次数已用尽。')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '下载文件' })).not.toBeInTheDocument()
  })

  it('连点只领取一次，并在卸载后释放 Blob URL', async () => {
    fetchMock.mockResolvedValueOnce(ok(metadata)).mockResolvedValueOnce(ok(grant)).mockResolvedValueOnce(new Response(new Blob(['file'])))
    const { unmount } = render(<FileViewer pasteId="file-one" initialStatus="active" hasPassword burnCount={1} />)
    await unlock()
    const button = screen.getByRole('button', { name: '下载文件' })
    fireEvent.click(button)
    fireEvent.click(button)
    await screen.findByText(/文件已交给浏览器/)
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/claim'))).toHaveLength(1)
    unmount()
    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-file'))
  })
})
