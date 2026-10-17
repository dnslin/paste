import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
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
  HTMLElement.prototype.scrollIntoView = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
})

describe('创建内容', () => {
  it.each(['success', 'error', 'network'] as const)('提交期间冻结所有输入，%s 后恢复编辑或显示成功结果', async (outcome) => {
    let resolve!: (response: Response) => void
    let reject!: (reason: Error) => void
    fetchMock.mockImplementation(() => new Promise<Response>((done, fail) => { resolve = done; reject = fail }))
    const busy = vi.fn()
    render(<PasteCreator onBusyChange={busy} />)
    inputContent('本次提交的内容')
    fireEvent.change(screen.getByLabelText('密码保护'), { target: { value: 'original-password' } })
    fireEvent.click(screen.getByRole('button', { name: '创建内容' }))

    const controls = [
      screen.getByLabelText('代码或文本内容'),
      screen.getByLabelText('密码保护'),
      screen.getByRole('button', { name: '显示密码' }),
      screen.getByRole('combobox', { name: '代码语言' }),
      screen.getByRole('combobox', { name: '过期时间' }),
      screen.getByRole('combobox', { name: '查看次数限制' }),
      screen.getByRole('tab', { name: '编辑' }),
      screen.getByRole('tab', { name: '预览' }),
    ]
    controls.forEach((control) => expect(control).toBeDisabled())
    for (const name of ['过期时间', '查看次数限制']) {
      const trigger = screen.getByRole('combobox', { name })
      trigger.hasPointerCapture = () => false
      const pointer = new MouseEvent('pointerdown', { bubbles: true, button: 0, ctrlKey: false })
      Object.defineProperty(pointer, 'pointerType', { value: 'mouse' })
      fireEvent(trigger, pointer)
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
      fireEvent.keyDown(trigger, { key: 'ArrowDown' })
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    }
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ content: '本次提交的内容', password: 'original-password' })
    expect(busy).toHaveBeenLastCalledWith(true)

    await act(async () => {
      if (outcome === 'network') reject(new Error('offline'))
      else resolve(Response.json(outcome === 'success'
        ? { success: true, data: { id: 'abc123', url: 'http://localhost/abc123' } }
        : { success: false, error: { code: 'ERROR', message: '创建请求失败' } }, { status: outcome === 'success' ? 201 : 500 }))
    })
    expect(busy).toHaveBeenLastCalledWith(false)
    expect(fetchMock).toHaveBeenCalledOnce()
    if (outcome === 'success') {
      fireEvent.click(screen.getByRole('button', { name: '关闭' }))
      expect(screen.queryByLabelText('代码或文本内容')).not.toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'http://localhost/abc123' })).toBeInTheDocument()
      return
    }
    controls.forEach((control) => expect(control).toBeEnabled())
    expect(screen.getByLabelText('代码或文本内容')).toHaveValue('本次提交的内容')
    expect(screen.getByLabelText('密码保护')).toHaveValue('original-password')
    fireEvent.keyDown(screen.getByRole('combobox', { name: '过期时间' }), { key: 'ArrowDown' })
    expect(await screen.findByRole('listbox')).toBeInTheDocument()
  })

  it('关闭成功提示后仍可复制原链接，只有创建另一条才重置表单', async () => {
    const url = 'http://localhost/abc123'
    fetchMock.mockResolvedValue(Response.json({ success: true, data: { id: 'abc123', url } }, { status: 201 }))
    render(<PasteCreator />)
    inputContent('已创建内容')
    fireEvent.change(screen.getByLabelText('密码保护'), { target: { value: 'private-password' } })
    fireEvent.click(screen.getByRole('button', { name: '创建内容' }))
    const dialog = await screen.findByRole('dialog')
    await waitFor(() => expect(writeText).toHaveBeenCalledOnce())
    fireEvent.keyDown(dialog, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.queryByRole('button', { name: '创建内容' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: url })).toHaveAttribute('href', url)
    await waitFor(() => expect(screen.getByRole('button', { name: '复制链接' })).toHaveFocus())
    expect(writeText).toHaveBeenCalledOnce()
    writeText.mockRejectedValueOnce(new Error('denied'))
    fireEvent.click(screen.getByRole('button', { name: '复制链接' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('请重试或手动复制链接')
    fireEvent.click(screen.getByRole('button', { name: '复制链接' }))
    expect(await screen.findByRole('button', { name: '已复制' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: '创建另一条' }))
    expect(screen.getByLabelText('代码或文本内容')).toHaveValue('')
    expect(screen.getByLabelText('代码或文本内容')).toHaveFocus()
    expect(screen.getByLabelText('密码保护')).toHaveValue('')
    expect(screen.getByRole('button', { name: '创建内容' })).toBeDisabled()
    expect(screen.queryByRole('link', { name: url })).not.toBeInTheDocument()
  })

  it('从成功弹窗直接创建另一条后，退出回焦点仍落在新编辑器', async () => {
    fetchMock.mockResolvedValue(Response.json({ success: true, data: { id: 'abc123', url: 'http://localhost/abc123' } }, { status: 201 }))
    render(<PasteCreator />)
    inputContent()
    fireEvent.click(screen.getByRole('button', { name: '创建内容' }))
    await screen.findByRole('dialog')
    fireEvent.click(screen.getByRole('button', { name: '创建另一条' }))
    await waitFor(() => expect(screen.getByLabelText('代码或文本内容')).toHaveFocus())
  })

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
    expect(screen.getByLabelText('密码保护')).toHaveAccessibleDescription(screen.getByRole('alert').textContent!)
    fireEvent.change(screen.getByLabelText('密码保护'), { target: { value: '   ' } })
    expect(screen.getByRole('button', { name: '创建内容' })).toBeDisabled()
    fireEvent.change(screen.getByLabelText('密码保护'), { target: { value: '密'.repeat(24) } })
    expect(screen.getByRole('button', { name: '创建内容' })).toBeEnabled()
    expect(screen.getByLabelText('密码保护')).not.toHaveAttribute('aria-describedby')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
