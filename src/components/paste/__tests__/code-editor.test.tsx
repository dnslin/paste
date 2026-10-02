import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CodeEditor } from '../code-editor'
import { highlightCode } from '@/lib/highlight'

vi.mock('@/lib/highlight', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/highlight')>(),
  highlightCode: vi.fn(),
}))
const highlightMock = vi.mocked(highlightCode)

beforeEach(() => { highlightMock.mockReset(); vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })

describe('编辑器键盘和预览', () => {
  it('关联输入标签、tab语义和键盘切换', () => {
    render(<CodeEditor value="" onChange={() => {}} language="plaintext" />)
    expect(screen.getByRole('textbox', { name: '代码或文本内容' })).toBeInTheDocument()
    const edit = screen.getByRole('tab', { name: '编辑' })
    expect(edit).toHaveAttribute('aria-selected', 'true')
    fireEvent.keyDown(edit, { key: 'ArrowRight' })
    expect(screen.getByRole('tab', { name: '预览' })).toHaveFocus()
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName('预览')
    fireEvent.keyDown(screen.getByRole('tab', { name: '预览' }), { key: 'Home' })
    expect(edit).toHaveFocus()
  })

  it('Tab缩进，但Shift+Tab和Esc后Tab允许离开编辑器', () => {
    const onChange = vi.fn()
    render(<CodeEditor value="hello" onChange={onChange} language="plaintext" />)
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    textarea.setSelectionRange(0, 0)
    expect(fireEvent.keyDown(textarea, { key: 'Tab' })).toBe(false)
    expect(onChange).toHaveBeenCalledWith('  hello')
    expect(fireEvent.keyDown(textarea, { key: 'Tab', shiftKey: true })).toBe(true)
    fireEvent.keyDown(textarea, { key: 'Escape' })
    expect(fireEvent.keyDown(textarea, { key: 'Tab' })).toBe(true)
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('源内容改变后旧高亮结果不能覆盖新预览', async () => {
    let resolveOld: (html: string) => void = () => {}
    let resolveNew: (html: string) => void = () => {}
    highlightMock.mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveNew = resolve }))
    const { rerender } = render(<CodeEditor value="旧内容" onChange={() => {}} language="javascript" />)
    fireEvent.click(screen.getByRole('tab', { name: '预览' }))
    await act(async () => { vi.advanceTimersByTime(300) })
    rerender(<CodeEditor value="新内容" onChange={() => {}} language="javascript" />)
    expect(screen.getByText('新内容')).toBeInTheDocument()
    await act(async () => { vi.advanceTimersByTime(300); resolveNew('<pre>新高亮</pre>') })
    expect(screen.getByText('新高亮')).toBeInTheDocument()
    await act(async () => { resolveOld('<pre>旧高亮</pre>') })
    expect(screen.getByText('新高亮')).toBeInTheDocument()
    expect(screen.queryByText('旧高亮')).not.toBeInTheDocument()
  })

  it('清空内容或退出预览后不会提交已启动的旧结果', async () => {
    let resolve: (html: string) => void = () => {}
    highlightMock.mockImplementationOnce(() => new Promise((done) => { resolve = done }))
    const { rerender } = render(<CodeEditor value="旧内容" onChange={() => {}} language="javascript" />)
    fireEvent.click(screen.getByRole('tab', { name: '预览' }))
    await act(async () => { vi.advanceTimersByTime(300) })
    rerender(<CodeEditor value="" onChange={() => {}} language="javascript" />)
    await act(async () => { resolve('<pre>已过时</pre>') })
    expect(screen.getByText('暂无内容可预览')).toBeInTheDocument()
    expect(screen.queryByText('已过时')).not.toBeInTheDocument()
  })
})
