import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { FileCreator } from '../file-creator'

class UploadRequest {
  static instances: UploadRequest[] = []
  upload = { onprogress: null as ((event: ProgressEvent) => void) | null, onload: null as (() => void) | null }
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  onabort: (() => void) | null = null
  ontimeout: (() => void) | null = null
  status = 200
  responseText = ''
  timeout = 0
  body: FormData | null = null
  open = vi.fn()
  send = vi.fn((body: FormData) => { this.body = body })
  abort = vi.fn(() => this.onabort?.())
  constructor() { UploadRequest.instances.push(this) }
}

beforeEach(() => {
  UploadRequest.instances = []
  vi.stubGlobal('XMLHttpRequest', UploadRequest)
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockResolvedValue(undefined) } })
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
function selectFile(file = new File(['secret file'], 'report.txt')) {
  fireEvent.change(screen.getByLabelText('选择文件'), { target: { files: [file] } })
}

describe('管理员文件上传', () => {
  it('选择单文件后手动上传，使用一日一次的默认参数与真实进度', async () => {
    render(<FileCreator />)
    selectFile()
    expect(UploadRequest.instances).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: '上传并创建分享' }))
    const xhr = UploadRequest.instances[0]
    expect(xhr.open).toHaveBeenCalledWith('POST', '/api/files')
    expect(xhr.body?.get('expiresIn')).toBe('1440')
    expect(xhr.body?.get('burnAfterRead')).toBe('1')
    act(() => xhr.upload.onprogress?.(new ProgressEvent('progress', { lengthComputable: true, loaded: 40, total: 100 })))
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', '40')
    act(() => xhr.upload.onload?.())
    expect(screen.getByText('服务器处理中…')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await act(async () => { xhr.responseText = JSON.stringify({ success: true, data: { id: 'one', url: 'https://paste.test/one', expiresAt: '2027-01-01' } }); xhr.onload?.() })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('多文件和超出 10 MiB 的文件不能上传，也能移除换选', () => {
    render(<FileCreator />)
    fireEvent.drop(screen.getByRole('group', { name: '文件选择区' }), { dataTransfer: { files: [new File(['a'], 'a.txt'), new File(['b'], 'b.txt')] } })
    expect(screen.getByRole('alert')).toHaveTextContent('一次只能选择一个文件')
    const huge = new File(['x'], 'huge.zip')
    Object.defineProperty(huge, 'size', { value: 10 * 1024 * 1024 + 1 })
    selectFile(huge)
    expect(screen.getByRole('alert')).toHaveTextContent('10 MiB')
    expect(screen.getByRole('button', { name: '上传并创建分享' })).toBeDisabled()
    selectFile()
    fireEvent.click(screen.getByRole('button', { name: '移除文件' }))
    expect(screen.queryByText('report.txt')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '上传并创建分享' })).toBeDisabled()
  })

  it('取消或连接丢失不展示成功、不自动重传，先提示检查管理列表', () => {
    render(<FileCreator />)
    selectFile()
    fireEvent.click(screen.getByRole('button', { name: '上传并创建分享' }))
    fireEvent.click(screen.getByRole('button', { name: '取消上传' }))
    expect(UploadRequest.instances[0].abort).toHaveBeenCalledOnce()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('管理列表')
    expect(screen.getByRole('link', { name: '打开管理列表' })).toHaveAttribute('href', '/admin')
    expect(screen.getByRole('button', { name: '上传并创建分享' })).toBeDisabled()
    expect(UploadRequest.instances).toHaveLength(1)
    fireEvent.click(screen.getByLabelText('我已检查管理列表，确认需要重新上传'))
    fireEvent.click(screen.getByRole('button', { name: '上传并创建分享' }))
    expect(UploadRequest.instances).toHaveLength(2)
  })
})
