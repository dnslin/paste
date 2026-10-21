import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FileCreator } from '../file-creator'
import { FileReceiver } from '../file-receiver'
import { ShareCreator } from '@/components/share-creator'
import { FILE_ACCEPT, MAX_FILE_BYTES } from '@/lib/file-rules'
import type { FileShareMetadata } from '@/lib/file-share-contract'

class UploadRequest {
  static requests: UploadRequest[] = []
  status = 0
  responseText = ''
  upload: {
    onprogress: ((event: { lengthComputable: boolean; loaded: number; total: number }) => void) | null
    onload: (() => void) | null
  } = { onprogress: null, onload: null }
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  ontimeout: (() => void) | null = null
  onabort: (() => void) | null = null
  open = vi.fn()
  send = vi.fn()
  abort = vi.fn(() => this.onabort?.())
  constructor() { UploadRequest.requests.push(this) }
  respond(status: number, body: unknown) { this.status = status; this.responseText = typeof body === 'string' ? body : JSON.stringify(body); this.onload?.() }
}

const file = new File(['交付文档'], '项目说明.md', { type: 'text/markdown' })
const created = { id: 'file123', url: 'http://localhost/f/file123', expiresAt: '2027-01-01T00:00:00.000Z', downloadLimit: 3 }
const metadata: FileShareMetadata = { id: 'file123', status: 'active', hasPassword: false, expiresAt: created.expiresAt, downloadsRemaining: 3, fileName: file.name, size: file.size }
const fetchMock = vi.fn()
const createObjectURL = vi.fn(() => 'blob:download')
const revokeObjectURL = vi.fn()
const anchorClick = vi.fn()

beforeEach(() => {
  UploadRequest.requests = []
  fetchMock.mockReset()
  createObjectURL.mockReset().mockReturnValue('blob:download')
  revokeObjectURL.mockReset()
  anchorClick.mockReset()
  vi.stubGlobal('XMLHttpRequest', UploadRequest)
  vi.stubGlobal('fetch', fetchMock)
  vi.stubGlobal('URL', class extends URL { static createObjectURL = createObjectURL; static revokeObjectURL = revokeObjectURL })
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { anchorClick(this.download, this.href) })
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockResolvedValue(undefined) } })
})

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

function selectFile(selected = file) {
  fireEvent.change(screen.getByLabelText('选择分享文件'), { target: { files: [selected] } })
}
function startUpload() {
  fireEvent.click(screen.getByRole('button', { name: '生成链接' }))
  return UploadRequest.requests.at(-1)!
}
function binaryResponse(remaining: string = '2', blob = new Blob(['交付文档'])) {
  return { ok: true, status: 200, headers: new Headers({ 'Content-Type': 'application/octet-stream', 'X-File-Name': encodeURIComponent(file.name), 'X-Downloads-Remaining': remaining }), blob: vi.fn().mockResolvedValue(blob) }
}

describe('正式文件创建', () => {
  it('仅真实文件入口，接受空文件和恰好上限，阻止多文件/超限/不支持类型', () => {
    render(<FileCreator />)
    expect(screen.getByRole('button', { name: '生成链接' })).toBeDisabled()
    expect(screen.getByLabelText('选择分享文件')).toHaveAttribute('accept', FILE_ACCEPT)
    expect(screen.queryByText('试用示例')).not.toBeInTheDocument()
    expect(screen.queryByText('演示选项')).not.toBeInTheDocument()
    selectFile(new File([], 'empty.txt'))
    expect(screen.getByRole('button', { name: '生成链接' })).toBeEnabled()
    selectFile(new File([new Uint8Array(MAX_FILE_BYTES)], 'limit.zip'))
    expect(screen.getByRole('button', { name: '生成链接' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: '移除文件' }))
    selectFile(new File([new Uint8Array(MAX_FILE_BYTES + 1)], 'large.zip'))
    expect(screen.getByRole('alert')).toHaveTextContent('超过 10 MiB')
    expect(screen.getByRole('button', { name: '生成链接' })).toBeDisabled()
    fireEvent.change(screen.getByLabelText('选择分享文件'), { target: { files: [file, file] } })
    expect(screen.getByRole('alert')).toHaveTextContent('一个文件')
    selectFile(new File(['binary'], 'tool.exe'))
    expect(screen.getByRole('alert')).toHaveTextContent('文本、PDF、图片或 ZIP')
    selectFile()
    fireEvent.click(screen.getByRole('button', { name: '移除文件' }))
    expect(screen.getByRole('button', { name: '生成链接' })).toBeDisabled()
    expect(UploadRequest.requests).toHaveLength(0)
  })

  it.each([
    { reason: '不支持的类型', files: [new File(['binary'], 'tool.exe')] },
    { reason: '超限文件', files: [new File([new Uint8Array(MAX_FILE_BYTES + 1)], 'large.zip')] },
    { reason: '多个文件', files: [file, file] },
    { reason: '空选择', files: [] },
  ])('更换为$reason时保留原文件可提交，并明确说明未更换', ({ files }) => {
    render(<FileCreator />)
    selectFile()
    fireEvent.change(screen.getByLabelText('密码保护'), { target: { value: 'keep-me' } })
    fireEvent.drop(screen.getByText(file.name).closest('.border')!, { dataTransfer: { files } })
    expect(screen.getByText(file.name)).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('未更换，仍可上传原文件')
    expect(screen.getByRole('button', { name: '生成链接' })).toBeEnabled()
    const request = startUpload()
    const form = request.send.mock.calls[0][0] as FormData
    expect(form.get('file')).toBe(file)
    expect(form.get('password')).toBe('keep-me')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('发送真实multipart字段，100%传输后仍等待201才显示成功链接', async () => {
    const busy = vi.fn()
    render(<FileCreator onBusyChange={busy} />)
    selectFile()
    fireEvent.change(screen.getByLabelText('密码保护'), { target: { value: 'private-password' } })
    const request = startUpload()
    expect(request.open).toHaveBeenCalledWith('POST', '/api/files')
    const form = request.send.mock.calls[0][0] as FormData
    expect(form.get('file')).toBe(file)
    expect(form.get('password')).toBe('private-password')
    expect(form.get('expiresIn')).toBe('1440')
    expect(form.get('downloadLimit')).toBe('3')
    expect(screen.getByRole('progressbar')).not.toHaveAttribute('value')
    act(() => { request.upload.onprogress?.({ lengthComputable: true, loaded: 50, total: 100 }) })
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', '50')
    act(() => { request.upload.onprogress?.({ lengthComputable: true, loaded: 100, total: 100 }) })
    expect(screen.getByRole('status')).toHaveTextContent('正在保存')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '正在生成链接…' })).toBeDisabled()
    act(() => request.respond(201, { success: true, data: created }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '查看分享' })).toHaveAttribute('href', created.url)
    expect(busy.mock.calls.map(([value]) => value)).toEqual([true, false])
    fireEvent.click(screen.getByRole('button', { name: '创建另一条' }))
    expect(screen.queryByText(file.name)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '生成链接' })).toBeDisabled()
  })

  it('取消后终止请求并保留草稿，迟到成功响应不会弹窗', () => {
    render(<FileCreator />)
    selectFile()
    fireEvent.change(screen.getByLabelText('密码保护'), { target: { value: 'keep-me' } })
    const request = startUpload()
    fireEvent.click(screen.getByRole('button', { name: '取消' }))
    expect(request.abort).toHaveBeenCalledOnce()
    act(() => request.respond(201, { success: true, data: created }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText(file.name)).toBeInTheDocument()
    expect(screen.getByLabelText('密码保护')).toHaveValue('keep-me')
    expect(screen.getByRole('status')).toHaveTextContent('已完成的分享仍会保留至到期')
    expect(screen.getByRole('button', { name: '生成链接' })).toBeEnabled()
  })

  it.each([400, 429, 500])('%s错误保留文件与选项，重试不会自动重复提交', (status) => {
    render(<FileCreator />)
    selectFile()
    fireEvent.change(screen.getByLabelText('密码保护'), { target: { value: 'keep-me' } })
    const request = startUpload()
    act(() => request.respond(status, { success: false, error: { code: 'TEST', message: '服务器拒绝本次上传' } }))
    expect(screen.getByRole('alert')).toHaveTextContent('服务器拒绝本次上传')
    expect(screen.getByLabelText('密码保护')).toHaveValue('keep-me')
    expect(screen.getByText(file.name)).toBeInTheDocument()
    expect(UploadRequest.requests).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: '生成链接' }))
    expect(UploadRequest.requests).toHaveLength(2)
  })

  it('识别代理非JSON的413，网络中断可恢复，卸载终止活动请求', () => {
    const { unmount } = render(<FileCreator />)
    selectFile()
    const request = startUpload()
    act(() => request.respond(413, '<html>Request Entity Too Large</html>'))
    expect(screen.getByRole('alert')).toHaveTextContent('不超过 10 MiB')
    fireEvent.click(screen.getByRole('button', { name: '生成链接' }))
    const retry = UploadRequest.requests.at(-1)!
    act(() => retry.onerror?.())
    expect(screen.getByRole('alert')).toHaveTextContent('网络中断')
    fireEvent.click(screen.getByRole('button', { name: '生成链接' }))
    const pending = UploadRequest.requests.at(-1)!
    unmount()
    expect(pending.abort).toHaveBeenCalledOnce()
  })

  it('切换页签保留文本和文件各自草稿，上传中不允许切换', () => {
    render(<ShareCreator />)
    expect(screen.getByRole('tab', { name: '文本 / 代码' })).toHaveAttribute('aria-selected', 'true')
    fireEvent.change(screen.getByLabelText('代码或文本内容'), { target: { value: '原有文本内容' } })
    fireEvent.mouseDown(screen.getByRole('tab', { name: '文件' }), { button: 0, ctrlKey: false })
    selectFile()
    fireEvent.mouseDown(screen.getByRole('tab', { name: '文本 / 代码' }), { button: 0, ctrlKey: false })
    expect(screen.getByLabelText('代码或文本内容')).toHaveValue('原有文本内容')
    fireEvent.mouseDown(screen.getByRole('tab', { name: '文件' }), { button: 0, ctrlKey: false })
    expect(screen.getByText(file.name)).toBeInTheDocument()
    startUpload()
    expect(screen.getByRole('tab', { name: '文本 / 代码' })).toBeDisabled()
  })
})

describe('正式文件下载', () => {
  it.each([false, true])('密码保护=%s时分别显示请求阶段，读取响应体期间显示正在下载', async (hasPassword) => {
    let resolveRequest!: (response: ReturnType<typeof binaryResponse>) => void
    let resolveBlob!: (blob: Blob) => void
    fetchMock.mockImplementation(() => new Promise((resolve) => { resolveRequest = resolve }))
    const response = binaryResponse()
    response.blob.mockImplementation(() => new Promise((resolve) => { resolveBlob = resolve }))
    render(<FileReceiver initialMetadata={hasPassword ? { ...metadata, hasPassword, fileName: undefined, size: undefined } : metadata} />)
    if (hasPassword) fireEvent.change(screen.getByLabelText('访问密码'), { target: { value: 'correct' } })
    fireEvent.click(screen.getByRole('button', { name: hasPassword ? '验证密码并下载' : '下载文件' }))
    expect(screen.getByRole('button', { name: hasPassword ? '正在验证…' : '正在准备…' })).toBeDisabled()
    await act(async () => resolveRequest(response))
    expect(screen.getByRole('button', { name: '正在下载文件…' })).toBeDisabled()
    expect(createObjectURL).not.toHaveBeenCalled()
    await act(async () => resolveBlob(new Blob(['下载完成'])))
    expect(screen.getByRole('status')).toHaveTextContent('已发起下载。')
  })

  it('页面渲染不下载，错误密码不泄露名称或减少次数', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401, json: async () => ({ success: false, error: { code: 'INVALID_PASSWORD', message: '密码不正确，请重新输入。' } }) })
    render(<FileReceiver initialMetadata={{ ...metadata, hasPassword: true, fileName: undefined, size: undefined }} />)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.queryByText(file.name)).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('访问密码'), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: '验证密码并下载' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('密码不正确')
    expect(screen.queryByText(file.name)).not.toBeInTheDocument()
    expect(screen.getByText('剩余 3 次下载机会')).toBeInTheDocument()
    expect(screen.getByLabelText('访问密码')).toHaveValue('wrong')
    expect(createObjectURL).not.toHaveBeenCalled()
    expect(fetchMock.mock.calls[0][0]).toBe('/api/files/file123/download')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ password: 'wrong' })
  })

  it('显式POST下载真实Blob，使用服务端文件名和余量，连点只请求一次', async () => {
    const blob = new Blob(['真实内容'])
    let finish!: (response: ReturnType<typeof binaryResponse>) => void
    fetchMock.mockImplementation(() => new Promise((resolve) => { finish = resolve }))
    const { unmount } = render(<FileReceiver initialMetadata={metadata} />)
    const button = screen.getByRole('button', { name: '下载文件' })
    fireEvent.click(button)
    fireEvent.click(button)
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock.mock.calls[0][1].method).toBe('POST')
    await act(async () => finish(binaryResponse('0', blob)))
    expect(createObjectURL).toHaveBeenCalledWith(blob)
    expect(anchorClick).toHaveBeenCalledWith(file.name, 'blob:download')
    expect(screen.getByText('剩余 0 次下载机会')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '下载机会已用尽' })).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent('已发起下载。这是最后一次机会。')
    unmount()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:download')
  })

  it('密码成功后才从响应头显示文件信息，下一次领取仍提交密码', async () => {
    fetchMock.mockResolvedValue(binaryResponse())
    render(<FileReceiver initialMetadata={{ ...metadata, hasPassword: true, fileName: undefined, size: undefined }} />)
    fireEvent.change(screen.getByLabelText('访问密码'), { target: { value: 'correct' } })
    fireEvent.click(screen.getByRole('button', { name: '验证密码并下载' }))
    expect(await screen.findByText(file.name)).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: '下载文件' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: '下载文件' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ password: 'correct' })
  })

  it('响应体传输中断仍使用服务端已扣减的次数，保留重试入口', async () => {
    const response = binaryResponse('2')
    response.blob.mockRejectedValue(new Error('transfer interrupted'))
    fetchMock.mockResolvedValue(response)
    render(<FileReceiver initialMetadata={metadata} />)
    fireEvent.click(screen.getByRole('button', { name: '下载文件' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('中断也会计次')
    expect(screen.getByRole('alert')).toHaveTextContent('重试')
    expect(screen.getByText('剩余 2 次下载机会')).toBeInTheDocument()
    expect(createObjectURL).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: '下载文件' })).toBeEnabled()
  })

  it('最后一次下载传输中断时说明次数已扣完并联系分享者，不再建议重试', async () => {
    const response = binaryResponse('0')
    response.blob.mockRejectedValue(new Error('transfer interrupted'))
    fetchMock.mockResolvedValue(response)
    render(<FileReceiver initialMetadata={{ ...metadata, downloadsRemaining: 1 }} />)
    fireEvent.click(screen.getByRole('button', { name: '下载文件' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('最后一次下载机会已计次')
    expect(screen.getByRole('alert')).toHaveTextContent('请联系分享者获取新链接')
    expect(screen.getByRole('alert')).not.toHaveTextContent('重试')
    expect(screen.getByRole('button', { name: '下载机会已用尽' })).toBeDisabled()
    expect(createObjectURL).not.toHaveBeenCalled()
  })

  it('请求期间卸载会abort，不在卸载后触发浏览器保存', async () => {
    let finish!: (response: ReturnType<typeof binaryResponse>) => void
    fetchMock.mockImplementation(() => new Promise((resolve) => { finish = resolve }))
    const { unmount } = render(<FileReceiver initialMetadata={metadata} />)
    fireEvent.click(screen.getByRole('button', { name: '下载文件' }))
    const signal = fetchMock.mock.calls[0][1].signal as AbortSignal
    unmount()
    expect(signal.aborted).toBe(true)
    await act(async () => finish(binaryResponse()))
    expect(createObjectURL).not.toHaveBeenCalled()
  })

  it.each(['expired', 'exhausted', 'deleted'] as const)('%s不提供下载，也不自动调用API', (status) => {
    render(<FileReceiver initialMetadata={{ ...metadata, status }} />)
    expect(screen.queryByRole('button', { name: '下载文件' })).not.toBeInTheDocument()
    expect(screen.getByText('请联系分享者获取新链接。')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('分享不存在提示联系分享者，服务错误提示刷新重试', () => {
    const { rerender } = render(<FileReceiver initialMetadata={null} />)
    expect(screen.getByText('请联系分享者获取新链接。')).toBeInTheDocument()
    rerender(<FileReceiver key="service-error" initialMetadata={null} initialError />)
    expect(screen.getByText('请稍后刷新页面重试。')).toBeInTheDocument()
    expect(screen.queryByText('请联系分享者获取新链接。')).not.toBeInTheDocument()
  })

  it('已打开页面后服务端判定过期，显示真实不可用状态', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404, json: async () => ({ success: false, error: { code: 'FILE_EXPIRED', message: '分享已过期' } }) })
    render(<FileReceiver initialMetadata={metadata} />)
    fireEvent.click(screen.getByRole('button', { name: '下载文件' }))
    expect(await screen.findByRole('heading', { name: '分享已过期' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '下载文件' })).not.toBeInTheDocument()
  })

  it('成功弹窗仅主动复制链接，错误反馈可见', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('permission denied'))
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    render(<FileCreator />)
    selectFile()
    const request = startUpload()
    act(() => request.respond(201, { success: true, data: created }))
    const dialog = screen.getByRole('dialog')
    expect(writeText).not.toHaveBeenCalled()
    fireEvent.click(within(dialog).getByRole('button', { name: '复制链接' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('浏览器拒绝了复制')
    expect(writeText).toHaveBeenCalledWith(created.url)
  })
})
