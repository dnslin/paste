import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SVGProps } from 'react'
import { FileCreator } from '../file-creator'
import { ShareCreator } from '@/components/share-creator'

vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value, role, title, 'aria-label': label }: { value: string; title?: string } & SVGProps<SVGSVGElement>) => <svg role={role} aria-label={label} data-value={value}><title>{title}</title></svg>,
}))

class UploadRequest {
  static requests: UploadRequest[] = []
  status = 0
  responseText = ''
  upload = { onprogress: null, onload: null }
  onload: (() => void) | null = null
  open = vi.fn()
  send = vi.fn()
  abort = vi.fn()
  constructor() { UploadRequest.requests.push(this) }
  succeed(result = created) {
    this.status = 201
    this.responseText = JSON.stringify({ success: true, data: result })
    this.onload?.()
  }
}

const created = { id: 'file123', url: 'http://localhost/f/file123', managementUrl: 'http://localhost/manage/file/file123#private-file-token', expiresAt: '2027-01-01T00:00:00.000Z', downloadLimit: 3 }
const file = new File(['交付文档'], `${'项目说明'.repeat(20)}.md`, { type: 'text/markdown' })
const writeText = vi.fn()
const fetchMock = vi.fn()

beforeEach(() => {
  UploadRequest.requests = []
  writeText.mockReset().mockResolvedValue(undefined)
  fetchMock.mockReset()
  vi.stubGlobal('XMLHttpRequest', UploadRequest)
  vi.stubGlobal('fetch', fetchMock)
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
})

function createFile(result = created) {
  const input = screen.getByLabelText('选择分享文件')
  fireEvent.change(input, { target: { files: [file] } })
  fireEvent.change(within(input.closest('form')!).getByLabelText('密码保护'), { target: { value: 'private-password' } })
  fireEvent.click(screen.getByRole('button', { name: '生成链接' }))
  act(() => UploadRequest.requests.at(-1)!.succeed(result))
}

describe('创建成功结果保留', () => {
  it('关闭文件弹窗保留原链接二维码，创建另一条才清空并替换为新链接', async () => {
    render(<FileCreator />)
    createFile()
    expect(screen.getByRole('dialog')).toHaveTextContent(file.name)
    expect(screen.getByRole('link', { name: '进入管理页' })).toHaveAttribute('href', created.managementUrl)
    expect(screen.getByRole('img', { name: '文件分享链接二维码' })).toHaveAttribute('data-value', created.url)
    expect(writeText).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '关闭' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: '复制链接' })).toHaveFocus())
    expect(screen.queryByRole('button', { name: '生成链接' })).not.toBeInTheDocument()
    expect(screen.getByText(file.name)).toBeInTheDocument()
    expect(screen.getByText(/密码保护/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '查看分享' })).toHaveAttribute('href', created.url)
    expect(screen.getByRole('link', { name: '进入管理页' })).toHaveAttribute('href', created.managementUrl)
    expect(screen.getByRole('img', { name: '文件分享链接二维码' })).toHaveAttribute('data-value', created.url)
    writeText.mockRejectedValueOnce(new Error('denied'))
    fireEvent.click(screen.getByRole('button', { name: '复制链接' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('手动复制链接')
    expect(screen.getByRole('link', { name: created.url })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '文件分享链接二维码' })).toHaveAttribute('data-value', created.url)
    fireEvent.click(screen.getByRole('button', { name: '复制链接' }))
    expect(await screen.findByRole('button', { name: '已复制' })).toBeInTheDocument()
    expect(writeText).toHaveBeenLastCalledWith(created.url)
    expect(UploadRequest.requests).toHaveLength(1)
    expect(UploadRequest.requests[0].open).toHaveBeenCalledWith('POST', '/api/files')
    expect(fetchMock).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '创建另一条' }))
    expect(screen.queryByText(file.name)).not.toBeInTheDocument()
    expect(screen.getByLabelText('密码保护')).toHaveValue('')
    expect(screen.getByRole('button', { name: '生成链接' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '选择文件' })).toHaveFocus()
    expect(screen.queryByRole('img', { name: '文件分享链接二维码' })).not.toBeInTheDocument()

    const nextCreated = { ...created, id: 'file456', url: 'https://share.example.com/f/file456?source=api#created', managementUrl: 'https://share.example.com/manage/file/file456#next-private-token' }
    createFile(nextCreated)
    expect(screen.getByRole('img', { name: '文件分享链接二维码' })).toHaveAttribute('data-value', nextCreated.url)
    expect(screen.queryByRole('link', { name: created.url })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: '进入管理页' })).toHaveAttribute('href', nextCreated.managementUrl)
    expect(UploadRequest.requests).toHaveLength(2)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(writeText).toHaveBeenCalledTimes(2)
  })

  it('从文件成功弹窗直接创建另一条后，退出回焦点落在文件选择按钮', async () => {
    render(<FileCreator />)
    createFile()
    fireEvent.click(screen.getByRole('button', { name: '创建另一条' }))
    await waitFor(() => expect(screen.getByRole('button', { name: '选择文件' })).toHaveFocus())
  })

  it('关闭弹窗后立即切换页签，迟到的回焦点不抢走当前页签焦点', async () => {
    render(<ShareCreator />)
    fireEvent.mouseDown(screen.getByRole('tab', { name: '文件' }), { button: 0, ctrlKey: false })
    createFile()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    const textTab = screen.getByRole('tab', { name: '文本 / 代码' })
    fireEvent.mouseDown(textTab, { button: 0, ctrlKey: false })
    act(() => textTab.focus())
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)) })
    expect(textTab).toHaveFocus()
  })

  it('切换分享类型仍保留各自的已创建结果，不重复请求或自动复制', async () => {
    const textUrl = 'http://localhost/text123'
    fetchMock.mockResolvedValue(Response.json({ success: true, data: { id: 'text123', url: textUrl, managementUrl: 'http://localhost/manage/text/text123#private-test-token', expiresAt: null } }, { status: 201 }))
    render(<ShareCreator />)
    fireEvent.change(screen.getByLabelText('代码或文本内容'), { target: { value: '已分享文本' } })
    fireEvent.click(screen.getByRole('button', { name: '生成链接' }))
    const dialog = await screen.findByRole('dialog')
    expect(screen.getByRole('img', { name: '文本分享链接二维码' })).toHaveAttribute('data-value', textUrl)
    await waitFor(() => expect(writeText).toHaveBeenCalledOnce())
    fireEvent.keyDown(dialog, { key: 'Escape' })
    fireEvent.mouseDown(screen.getByRole('tab', { name: '文件' }), { button: 0, ctrlKey: false })
    createFile()
    expect(screen.getByRole('img', { name: '文件分享链接二维码' })).toHaveAttribute('data-value', created.url)
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    fireEvent.mouseDown(screen.getByRole('tab', { name: '文本 / 代码' }), { button: 0, ctrlKey: false })
    expect(screen.getByRole('link', { name: textUrl })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '文本分享链接二维码' })).toHaveAttribute('data-value', textUrl)
    expect(screen.queryByRole('img', { name: '文件分享链接二维码' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '生成链接' })).not.toBeInTheDocument()
    fireEvent.mouseDown(screen.getByRole('tab', { name: '文件' }), { button: 0, ctrlKey: false })
    expect(screen.getByRole('link', { name: '查看分享' })).toHaveAttribute('href', created.url)
    expect(screen.getByRole('img', { name: '文件分享链接二维码' })).toHaveAttribute('data-value', created.url)
    expect(screen.queryByRole('img', { name: '文本分享链接二维码' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '生成链接' })).not.toBeInTheDocument()
    expect(writeText).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(UploadRequest.requests).toHaveLength(1)
  })
})
