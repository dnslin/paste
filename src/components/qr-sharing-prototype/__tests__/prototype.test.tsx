import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QrSharingPrototype } from '../qr-sharing-prototype'

const writeText = vi.fn()
const fetchMock = vi.fn()

beforeEach(() => {
  window.history.replaceState({}, '', '/prototype/qr-sharing')
  writeText.mockReset().mockResolvedValue(undefined)
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
})

async function selectFile() {
  await act(async () => { fireEvent.mouseDown(screen.getByRole('tab', { name: '文件' }), { button: 0, ctrlKey: false }) })
  await screen.findByRole('img', { name: '文件分享链接二维码' })
}

describe('二维码分享原型', () => {
  it('默认文本结果有二维码，手动复制的链接指向相同原型接收场景，不创建业务分享', async () => {
    render(<QrSharingPrototype />)
    expect(screen.getByRole('img', { name: '文本分享链接二维码' })).toBeInTheDocument()
    expect(writeText).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '复制链接' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/prototype/qr-sharing#receive-text`))
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('文件结果切换为文件二维码和链接，关闭文件成功弹窗后仍保留同一结果', async () => {
    render(<QrSharingPrototype />)
    await selectFile()
    expect(screen.getByText('项目交付说明与接口字段参考文档.md')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '查看成功弹窗' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('img', { name: '文件分享链接二维码' })).toBeInTheDocument()
    expect(writeText).not.toHaveBeenCalled()
    fireEvent.click(within(dialog).getByRole('button', { name: '复制链接' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/prototype/qr-sharing#receive-file`))
    fireEvent.click(within(dialog).getByRole('button', { name: '关闭' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByRole('img', { name: '文件分享链接二维码' })).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('文本成功弹窗沿用自动复制，关闭后保留二维码并回焦点到复制按钮', async () => {
    render(<QrSharingPrototype />)
    fireEvent.click(screen.getByRole('button', { name: '查看成功弹窗' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: '链接已生成' })).toBeInTheDocument()
    await waitFor(() => expect(writeText).toHaveBeenCalledOnce())
    fireEvent.click(within(dialog).getByRole('button', { name: '关闭' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByRole('img', { name: '文本分享链接二维码' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: '复制链接' })).toHaveFocus())
    expect(writeText).toHaveBeenCalledOnce()
  })

  it('创建另一条先回到演示生成入口，再生成显示新的成功弹窗', async () => {
    render(<QrSharingPrototype />)
    fireEvent.click(screen.getByRole('button', { name: '创建另一条' }))
    expect(screen.queryByRole('img', { name: '文本分享链接二维码' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '生成链接' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('img', { name: '文本分享链接二维码' })).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('查看分享进入已有接收原型，返回后仍展示原链接与二维码', async () => {
    render(<QrSharingPrototype />)
    fireEvent.click(screen.getByRole('button', { name: '查看分享' }))
    expect(await screen.findByRole('heading', { name: '受密码保护的分享' })).toBeInTheDocument()
    expect(window.location.hash).toBe('#receive-text')
    fireEvent.click(screen.getByRole('button', { name: '返回首页' }))
    expect(await screen.findByRole('img', { name: '文本分享链接二维码' })).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('复制失败保留二维码及链接，允许再次复制', async () => {
    writeText.mockRejectedValueOnce(new Error('denied'))
    render(<QrSharingPrototype />)
    fireEvent.click(screen.getByRole('button', { name: '复制链接' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('复制失败')
    expect(screen.getByRole('img', { name: '文本分享链接二维码' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '复制链接' }))
    expect(await screen.findByRole('button', { name: '已复制' })).toBeInTheDocument()
  })
})
