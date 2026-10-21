import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CreatorRevokePrototype } from '../creator-revoke-prototype'
import { demoPath, displayUrl } from '../model'

const writeText = vi.fn()
const fetchMock = vi.fn()

beforeEach(() => {
  vi.useFakeTimers()
  window.history.replaceState(null, '', '/prototype/creator-revoke#text/created')
  writeText.mockReset().mockResolvedValue(undefined)
  fetchMock.mockClear()
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

function selectScene(name: string) {
  fireEvent.mouseDown(screen.getByRole('tab', { name }), { button: 0, ctrlKey: false })
}
function openManager() { fireEvent.click(screen.getByRole('button', { name: '进入管理页' })) }
function openConfirmation() { fireEvent.click(screen.getByRole('button', { name: '撤销分享' })) }
async function finishRevoke() { await act(async () => { vi.advanceTimersByTime(550) }) }

describe('创建者主动撤销原型', () => {
  it.each(['text', 'file'] as const)('%s 分开展示并复制分享与私人管理链接', async (kind) => {
    render(<CreatorRevokePrototype />)
    fireEvent.change(screen.getByLabelText('分享类型'), { target: { value: kind } })
    expect(screen.getByText(displayUrl(kind))).toHaveAttribute('href', demoPath(kind, 'receive'))
    expect(screen.getByText(displayUrl(kind, true))).toHaveAttribute('href', demoPath(kind, 'manage'))
    expect(screen.getByText(/持有此链接即可撤销分享/)).toHaveTextContent('请勿发给接收者')
    fireEvent.click(screen.getByRole('button', { name: '复制分享链接' }))
    await act(async () => {})
    expect(writeText).toHaveBeenLastCalledWith(new URL(demoPath(kind, 'receive'), window.location.origin).href)
    fireEvent.click(screen.getByRole('button', { name: '复制管理链接' }))
    await act(async () => {})
    expect(writeText).toHaveBeenLastCalledWith(new URL(demoPath(kind, 'manage'), window.location.origin).href)
  })

  it('浏览管理页不领内容、不消耗次数，取消撤销继续可访问', async () => {
    render(<CreatorRevokePrototype />)
    openManager()
    expect(screen.getByText('分享中')).toBeInTheDocument()
    expect(screen.getByText(/剩余 3 次查看机会/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /查看内容/ })).not.toBeInTheDocument()
    openConfirmation()
    expect(within(screen.getByRole('dialog')).getByRole('button', { name: '继续分享' })).toHaveFocus()
    fireEvent.click(screen.getByRole('button', { name: '继续分享' }))
    await act(async () => { vi.advanceTimersByTime(0) })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '撤销分享' })).toHaveFocus()
    selectScene('接收者页面')
    expect(screen.getByRole('button', { name: '查看内容（模拟）' })).toBeInTheDocument()
    expect(screen.getByText(/剩余 3 次查看机会/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '复制管理链接' })).not.toBeInTheDocument()
    expect(screen.queryByText(displayUrl('text', true))).not.toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each(['text', 'file'] as const)('%s 确认后等待结果、阻止重复提交、接收者随后不能领取', async (kind) => {
    render(<CreatorRevokePrototype />)
    fireEvent.change(screen.getByLabelText('分享类型'), { target: { value: kind } })
    openManager()
    openConfirmation()
    fireEvent.click(screen.getByRole('button', { name: '确认撤销' }))
    expect(screen.getByRole('button', { name: '正在撤销…' })).toBeDisabled()
    expect(screen.queryByRole('heading', { name: '分享已撤销' })).not.toBeInTheDocument()
    await finishRevoke()
    await act(async () => { vi.advanceTimersByTime(0) })
    expect(screen.getByRole('heading', { name: '分享已撤销' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '分享已撤销' })).toHaveFocus()
    expect(screen.queryByRole('button', { name: '撤销分享' })).not.toBeInTheDocument()
    selectScene('接收者页面')
    expect(screen.getByRole('heading', { name: '分享已失效' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /（模拟）/ })).not.toBeInTheDocument()
    selectScene('私人管理页')
    expect(screen.getByRole('heading', { name: '管理链接无效或分享已失效' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '分享已撤销' })).not.toBeInTheDocument()
    selectScene('创建成功')
    expect(screen.getByRole('heading', { name: '分享已失效' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '复制分享链接' })).not.toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('撤销失败时保持分享生效，允许重试', async () => {
    render(<CreatorRevokePrototype />)
    openManager()
    fireEvent.click(screen.getByLabelText('下次撤销失败'))
    openConfirmation()
    fireEvent.click(screen.getByRole('button', { name: '确认撤销' }))
    await finishRevoke()
    expect(screen.getByRole('alert')).toHaveTextContent('撤销失败，分享仍在生效')
    expect(screen.queryByRole('heading', { name: '分享已撤销' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '重试撤销' }))
    await finishRevoke()
    expect(screen.getByRole('heading', { name: '分享已撤销' })).toBeInTheDocument()
  })

  it.each(['expired', 'exhausted'] as const)('%s 不再提供撤销或领取操作', (scenario) => {
    render(<CreatorRevokePrototype />)
    openManager()
    fireEvent.change(screen.getByLabelText('演示状态'), { target: { value: scenario } })
    expect(screen.getByText('分享已结束，无需再撤销。')).toBeInTheDocument()
    expect(screen.queryByText(/剩余 3 次查看机会/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '撤销分享' })).not.toBeInTheDocument()
    selectScene('接收者页面')
    expect(screen.getByRole('heading', { name: '分享已失效' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /（模拟）/ })).not.toBeInTheDocument()
  })

  it('无效管理链接不展示分享元信息，加载错误可以恢复', () => {
    render(<CreatorRevokePrototype />)
    fireEvent.change(screen.getByLabelText('分享类型'), { target: { value: 'file' } })
    openManager()
    fireEvent.change(screen.getByLabelText('演示状态'), { target: { value: 'invalid' } })
    expect(screen.getByRole('heading', { name: '管理链接无效或分享已失效' })).toBeInTheDocument()
    expect(screen.queryByText('项目交付说明与接口文档.zip')).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('演示状态'), { target: { value: 'load-error' } })
    expect(screen.getByRole('alert')).toHaveTextContent('网络连接中断')
    fireEvent.click(screen.getByRole('button', { name: '重新加载' }))
    expect(screen.getByText('分享中')).toBeInTheDocument()
  })

  it('复制失败给出重试与手动复制指引', async () => {
    writeText.mockRejectedValueOnce(new Error('denied'))
    render(<CreatorRevokePrototype />)
    fireEvent.click(screen.getByRole('button', { name: '复制管理链接' }))
    await act(async () => {})
    expect(screen.getByRole('alert')).toHaveTextContent('浏览器拒绝了复制')
    fireEvent.click(screen.getByRole('button', { name: '复制管理链接' }))
    await act(async () => {})
    expect(screen.getByRole('button', { name: '管理链接已复制' })).toBeInTheDocument()
  })

  it.each(['invalid', 'load-error'] as const)('管理页 %s 场景不影响接收者的有效分享', (scenario) => {
    render(<CreatorRevokePrototype />)
    openManager()
    fireEvent.change(screen.getByLabelText('演示状态'), { target: { value: scenario } })
    selectScene('接收者页面')
    expect(screen.getByLabelText('演示状态')).toHaveValue('current')
    expect(screen.getByRole('button', { name: '查看内容（模拟）' })).toBeInTheDocument()
  })

  it('Escape 取消确认后焦点返回撤销按钮', async () => {
    render(<CreatorRevokePrototype />)
    openManager()
    openConfirmation()
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' })
    await act(async () => { vi.advanceTimersByTime(0) })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '撤销分享' })).toHaveFocus()
    expect(screen.getByText('分享中')).toBeInTheDocument()
  })
})
