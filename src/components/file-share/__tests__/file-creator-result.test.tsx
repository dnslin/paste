import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FileCreator } from '../file-creator'
import { ShareCreator } from '@/components/share-creator'

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
  succeed() {
    this.status = 201
    this.responseText = JSON.stringify({ success: true, data: created })
    this.onload?.()
  }
}

const created = { id: 'file123', url: 'http://localhost/f/file123', expiresAt: null, downloadLimit: 3 }
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

function createFile() {
  const input = screen.getByLabelText('选择分享文件')
  fireEvent.change(input, { target: { files: [file] } })
  fireEvent.change(within(input.closest('form')!).getByLabelText('密码保护'), { target: { value: 'private-password' } })
  fireEvent.click(screen.getByRole('button', { name: '创建文件分享' }))
  act(() => UploadRequest.requests.at(-1)!.succeed())
}

describe('创建成功结果保留', () => {
  it('关闭文件成功弹窗后可复制和查看原结果，明确创建另一条才清空文件和选项', async () => {
    render(<FileCreator />)
    createFile()
    expect(screen.getByRole('dialog')).toHaveTextContent(file.name)
    expect(writeText).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '关闭成功提示' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: '复制链接' })).toHaveFocus())
    expect(screen.queryByRole('button', { name: '创建文件分享' })).not.toBeInTheDocument()
    expect(screen.getByText(file.name)).toBeInTheDocument()
    expect(screen.getByText(/密码保护/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '查看分享' })).toHaveAttribute('href', created.url)
    writeText.mockRejectedValueOnce(new Error('denied'))
    fireEvent.click(screen.getByRole('button', { name: '复制链接' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('请手动复制链接')
    expect(screen.getByRole('link', { name: created.url })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '复制链接' }))
    expect(await screen.findByRole('button', { name: '已复制' })).toBeInTheDocument()
    expect(writeText).toHaveBeenLastCalledWith(created.url)
    expect(UploadRequest.requests).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: '创建另一条' }))
    expect(screen.queryByText(file.name)).not.toBeInTheDocument()
    expect(screen.getByLabelText('密码保护')).toHaveValue('')
    expect(screen.getByRole('button', { name: '创建文件分享' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '选择文件' })).toHaveFocus()
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
    fetchMock.mockResolvedValue(Response.json({ success: true, data: { id: 'text123', url: textUrl } }, { status: 201 }))
    render(<ShareCreator />)
    fireEvent.change(screen.getByLabelText('代码或文本内容'), { target: { value: '已分享文本' } })
    fireEvent.click(screen.getByRole('button', { name: '创建内容' }))
    const dialog = await screen.findByRole('dialog')
    await waitFor(() => expect(writeText).toHaveBeenCalledOnce())
    fireEvent.keyDown(dialog, { key: 'Escape' })
    fireEvent.mouseDown(screen.getByRole('tab', { name: '文件' }), { button: 0, ctrlKey: false })
    createFile()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    fireEvent.mouseDown(screen.getByRole('tab', { name: '文本 / 代码' }), { button: 0, ctrlKey: false })
    expect(screen.getByRole('link', { name: textUrl })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '创建内容' })).not.toBeInTheDocument()
    fireEvent.mouseDown(screen.getByRole('tab', { name: '文件' }), { button: 0, ctrlKey: false })
    expect(screen.getByRole('link', { name: '查看分享' })).toHaveAttribute('href', created.url)
    expect(screen.queryByRole('button', { name: '创建文件分享' })).not.toBeInTheDocument()
    expect(writeText).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(UploadRequest.requests).toHaveLength(1)
  })
})
