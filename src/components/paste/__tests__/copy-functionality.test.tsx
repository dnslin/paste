import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CopyButton } from '../copy-button'
import { SuccessDialog } from '../success-dialog'

const writeText = vi.fn()
const url = 'https://example.com/abc123'

beforeEach(() => {
  writeText.mockReset().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
})
afterEach(() => { vi.useRealTimers() })

function renderDialog(open = true) {
  return render(<SuccessDialog open={open} onOpenChange={() => {}} url={url} onCreateAnother={() => {}} />)
}

describe('复制链接与内容', () => {
  it('首次open=true挂载自动复制；关闭后重新打开也复制', async () => {
    const { rerender } = renderDialog()
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1))
    rerender(<SuccessDialog open={false} onOpenChange={() => {}} url={url} onCreateAnother={() => {}} />)
    rerender(<SuccessDialog open onOpenChange={() => {}} url={url} onCreateAnother={() => {}} />)
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(2))
  })

  it('自动复制被拒绝时展示错误和链接，允许手动重试', async () => {
    writeText.mockRejectedValueOnce(new Error('denied'))
    renderDialog()
    expect(await screen.findByRole('alert')).toHaveTextContent('浏览器拒绝了复制')
    expect(screen.getByRole('link', { name: url })).toBeInTheDocument()
    expect(screen.queryByText('链接已复制到剪贴板。')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '复制链接' }))
    expect(await screen.findByText('链接已复制到剪贴板。')).toBeInTheDocument()
  })

  it('不支持或拒绝复制时不显示假成功', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined })
    render(<CopyButton content="正文" />)
    fireEvent.click(screen.getByRole('button', { name: '复制内容' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('复制失败')
    expect(screen.queryByRole('button', { name: '已复制' })).not.toBeInTheDocument()
  })

  it('重复复制会重置反馈定时器，卸载会清除定时器', async () => {
    vi.useFakeTimers()
    const { unmount } = render(<CopyButton content="正文" />)
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: '复制内容' })) })
    act(() => { vi.advanceTimersByTime(1500) })
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: '已复制' })) })
    act(() => { vi.advanceTimersByTime(1000) })
    expect(screen.getByRole('button', { name: '已复制' })).toBeInTheDocument()
    act(() => { vi.advanceTimersByTime(1000) })
    expect(screen.getByRole('button', { name: '复制内容' })).toBeInTheDocument()
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: '复制内容' })) })
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('新内容不会继承上一条的成功反馈', async () => {
    const { rerender } = render(<CopyButton content="旧正文" />)
    fireEvent.click(screen.getByRole('button', { name: '复制内容' }))
    expect(await screen.findByRole('button', { name: '已复制' })).toBeInTheDocument()
    rerender(<CopyButton content="新正文" />)
    expect(screen.getByRole('button', { name: '复制内容' })).toBeInTheDocument()
  })
})
