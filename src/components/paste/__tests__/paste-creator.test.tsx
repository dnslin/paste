import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { PasteCreator } from '../paste-creator'
import { MAX_CONTENT_LENGTH } from '@/lib/paste-rules'

const fetchMock = vi.fn()
const writeText = vi.fn()

function inputContent(content = 'console.log("hello")') {
  fireEvent.change(screen.getByLabelText('代码或文本内容'), { target: { value: content } })
}

beforeEach(() => {
  fetchMock.mockReset()
  writeText.mockReset().mockResolvedValue(undefined)
  vi.stubGlobal('fetch', fetchMock)
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
})

describe('创建内容', () => {
  it('禁用空内容和只有空白的提交', () => {
    render(<PasteCreator />)
    expect(screen.getByRole('button', { name: '创建内容' })).toBeDisabled()
    inputContent('   \n')
    expect(screen.getByRole('button', { name: '创建内容' })).toBeDisabled()
  })

  it('真实提交成功后首次挂载弹窗就自动复制可访问链接', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ success: true, data: { id: 'abc123', url: 'http://localhost:3000/abc123' } }) })
    render(<PasteCreator />)
    inputContent()
    fireEvent.click(screen.getByRole('button', { name: '创建内容' }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('http://localhost:3000/abc123'))
    expect(screen.getByRole('link', { name: 'http://localhost:3000/abc123' })).toHaveAttribute('href', 'http://localhost:3000/abc123')
    expect(fetchMock.mock.calls[0][1].body).toContain('console.log')
  })

  it.each([400, 429, 500])('显示 %s 服务端错误并保留输入以便重试', async (status) => {
    fetchMock.mockResolvedValue({ ok: false, status, json: async () => ({ success: false, error: { code: 'ERROR', message: '创建请求失败' } }) })
    render(<PasteCreator />)
    inputContent('不能丢失的内容')
    fireEvent.click(screen.getByRole('button', { name: '创建内容' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('创建请求失败')
    expect(screen.getByLabelText('代码或文本内容')).toHaveValue('不能丢失的内容')
    expect(screen.getByRole('button', { name: '创建内容' })).toBeEnabled()
  })

  it('网络错误可见且能再次提交', async () => {
    fetchMock.mockRejectedValue(new Error('offline'))
    render(<PasteCreator />)
    inputContent('保留内容')
    fireEvent.click(screen.getByRole('button', { name: '创建内容' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('检查网络连接')
    expect(screen.getByLabelText('代码或文本内容')).toHaveValue('保留内容')
  })

  it('拒绝超长内容和超72字节/空白密码', () => {
    render(<PasteCreator />)
    inputContent('x'.repeat(MAX_CONTENT_LENGTH + 1))
    expect(screen.getByRole('button', { name: '创建内容' })).toBeDisabled()
    expect(screen.getByText(/内容超过长度限制/)).toBeInTheDocument()
    inputContent('有效内容')
    fireEvent.change(screen.getByLabelText('密码保护'), { target: { value: '密'.repeat(25) } })
    expect(screen.getByRole('button', { name: '创建内容' })).toBeDisabled()
    fireEvent.change(screen.getByLabelText('密码保护'), { target: { value: '   ' } })
    expect(screen.getByRole('button', { name: '创建内容' })).toBeDisabled()
    fireEvent.change(screen.getByLabelText('密码保护'), { target: { value: '密'.repeat(24) } })
    expect(screen.getByRole('button', { name: '创建内容' })).toBeEnabled()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
