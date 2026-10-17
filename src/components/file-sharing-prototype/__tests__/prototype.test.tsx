import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ShareCreator } from '../share-creator'
import { ShareReceiver } from '../share-receiver'
import { AdminPreview } from '../admin-preview'
import { getFileError, MAX_FILE_BYTES, type PrototypeShare } from '../model'

const file = new File(['交付文档'], '项目说明.md', { type: 'text/markdown' })
const share: PrototypeShare = { item: { kind: 'file', file }, options: { password: '', expiresIn: 1440, limit: 1 } }
const createObjectURL = vi.fn(() => 'blob:prototype-file')

beforeEach(() => {
  vi.useFakeTimers()
  createObjectURL.mockClear()
  vi.stubGlobal('URL', class extends URL {
    static createObjectURL = createObjectURL
    static revokeObjectURL = vi.fn()
  })
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers() })

function selectFile(selected = file) {
  fireEvent.change(screen.getByLabelText('选择分享文件'), { target: { files: [selected] } })
}
async function finishUpload() {
  for (let step = 0; step < 8; step++) await act(async () => { vi.advanceTimersByTime(400) })
}

describe('文件选择边界', () => {
  it('接受零字节和恰好10MiB的文件，拒绝超限、多文件及无文件', () => {
    expect(getFileError([new File([], 'empty.txt')])).toBeNull()
    expect(getFileError([new File([new Uint8Array(MAX_FILE_BYTES)], 'limit.zip')])).toBeNull()
    expect(getFileError([new File([new Uint8Array(MAX_FILE_BYTES + 1)], 'large.zip')])).toContain('超过')
    expect(getFileError([file, file])).toContain('一个文件')
    expect(getFileError([])).toContain('一个文件')
  })
  it('未选文件不能提交，超限错误可恢复', () => {
    render(<ShareCreator onCreated={vi.fn()} />)
    expect(screen.getByRole('button', { name: '创建文件分享' })).toBeDisabled()
    selectFile(new File([new Uint8Array(MAX_FILE_BYTES + 1)], 'large.zip'))
    expect(screen.getByRole('alert')).toHaveTextContent('超过 10 MiB')
    selectFile()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '创建文件分享' })).toBeEnabled()
  })
  it('密码错误按需显示并关联字段，修正后可继续创建', () => {
    render(<ShareCreator onCreated={vi.fn()} />)
    selectFile()
    const password = screen.getByLabelText('密码保护')
    expect(password).not.toHaveAttribute('aria-describedby')
    fireEvent.change(password, { target: { value: '密'.repeat(25) } })
    expect(password).toHaveAttribute('aria-invalid', 'true')
    expect(password).toHaveAccessibleDescription(screen.getByRole('alert').textContent!)
    expect(screen.getByRole('button', { name: '创建文件分享' })).toBeDisabled()
    fireEvent.change(password, { target: { value: '' } })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(password).not.toHaveAttribute('aria-describedby')
    expect(screen.getByRole('button', { name: '创建文件分享' })).toBeEnabled()
  })
})

describe('创建交互', () => {
  it('文本和文件模式切换后保留各自内容与密码', () => {
    render(<ShareCreator onCreated={vi.fn()} />)
    selectFile()
    fireEvent.change(screen.getByLabelText('密码保护'), { target: { value: 'file-password' } })
    fireEvent.mouseDown(screen.getByRole('tab', { name: '文本 / 代码' }), { button: 0, ctrlKey: false })
    fireEvent.change(screen.getByLabelText('代码或文本内容'), { target: { value: '需要保留的文本' } })
    fireEvent.mouseDown(screen.getByRole('tab', { name: '文件' }), { button: 0, ctrlKey: false })
    expect(screen.getByText('项目说明.md')).toBeInTheDocument()
    expect(screen.getByLabelText('密码保护')).toHaveValue('file-password')
    fireEvent.mouseDown(screen.getByRole('tab', { name: '文本 / 代码' }), { button: 0, ctrlKey: false })
    expect(screen.getByLabelText('代码或文本内容')).toHaveValue('需要保留的文本')
  })
  it('取消上传不创建分享，且保留文件以便重试', async () => {
    const created = vi.fn()
    render(<ShareCreator onCreated={created} />)
    selectFile()
    fireEvent.click(screen.getByRole('button', { name: '创建文件分享' }))
    await act(async () => { vi.advanceTimersByTime(300) })
    fireEvent.click(screen.getByRole('button', { name: '取消' }))
    await finishUpload()
    expect(created).not.toHaveBeenCalled()
    expect(screen.getByRole('status')).toHaveTextContent('已取消')
    expect(screen.getByText('项目说明.md')).toBeInTheDocument()
  })
  it('模拟中断可重试，保存完成前不产生分享，也不请求上传 API', async () => {
    const created = vi.fn()
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    render(<ShareCreator onCreated={created} />)
    selectFile()
    fireEvent.click(screen.getByText('演示选项'))
    fireEvent.click(screen.getByLabelText('模拟上传中断'))
    fireEvent.click(screen.getByRole('button', { name: '创建文件分享' }))
    await finishUpload()
    expect(screen.getByRole('alert')).toHaveTextContent('网络中断')
    expect(created).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '重试上传' }))
    for (let step = 0; step < 6; step++) await act(async () => { vi.advanceTimersByTime(300) })
    expect(screen.getByRole('status')).toHaveTextContent('正在保存')
    expect(created).not.toHaveBeenCalled()
    await act(async () => { vi.advanceTimersByTime(600) })
    expect(created).toHaveBeenCalledOnce()
    expect(created.mock.calls[0][0].item.file).toBe(file)
    expect(fetchMock).not.toHaveBeenCalled()
  })
  it('文件上传失败不会污染文本模式的提示和创建操作', async () => {
    const created = vi.fn()
    render(<ShareCreator onCreated={created} />)
    selectFile()
    fireEvent.click(screen.getByText('演示选项'))
    fireEvent.click(screen.getByLabelText('模拟上传中断'))
    fireEvent.click(screen.getByRole('button', { name: '创建文件分享' }))
    await finishUpload()
    expect(screen.getByRole('alert')).toHaveTextContent('网络中断')
    fireEvent.mouseDown(screen.getByRole('tab', { name: '文本 / 代码' }), { button: 0, ctrlKey: false })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('代码或文本内容'), { target: { value: '文本分享不受文件失败影响' } })
    fireEvent.click(screen.getByRole('button', { name: '创建文本分享' }))
    expect(created).toHaveBeenCalledWith(expect.objectContaining({ item: expect.objectContaining({ kind: 'text', content: '文本分享不受文件失败影响' }) }))
    fireEvent.mouseDown(screen.getByRole('tab', { name: '文件' }), { button: 0, ctrlKey: false })
    expect(screen.getByRole('button', { name: '重试上传' })).toBeEnabled()
  })
})

describe('接收文件', () => {
  it('打开页面和错误密码不显示文件名或扣次数，正确密码后领取一次', async () => {
    const onExhausted = vi.fn()
    render(<ShareReceiver share={{ ...share, options: { ...share.options, password: 'correct' } }} scenario="current" onBack={vi.fn()} onExhausted={onExhausted} />)
    expect(screen.queryByText('项目说明.md')).not.toBeInTheDocument()
    expect(screen.getByText('剩余 1 次下载机会')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('访问密码'), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: '验证密码并下载' }))
    expect(screen.getByRole('alert')).toHaveTextContent('密码不正确')
    expect(screen.queryByText('项目说明.md')).not.toBeInTheDocument()
    expect(createObjectURL).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText('访问密码'), { target: { value: 'correct' } })
    fireEvent.click(screen.getByRole('button', { name: '验证密码并下载' }))
    await act(async () => { vi.advanceTimersByTime(650) })
    expect(createObjectURL).toHaveBeenCalledWith(file)
    expect(screen.getByRole('status')).toHaveTextContent('这是最后一次机会')
    expect(screen.getByRole('button', { name: '下载机会已用尽' })).toBeDisabled()
    expect(onExhausted).toHaveBeenCalledOnce()
  })
  it('连点下载只准备一次文件，准备失败不扣次数，可再次尝试', async () => {
    createObjectURL.mockImplementationOnce(() => { throw new Error('download unavailable') })
    render(<ShareReceiver share={share} scenario="current" onBack={vi.fn()} />)
    const download = screen.getByRole('button', { name: '下载文件' })
    fireEvent.click(download)
    fireEvent.click(download)
    await act(async () => { vi.advanceTimersByTime(650) })
    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(screen.getByRole('alert')).toHaveTextContent('此次没有扣除')
    expect(screen.getByText('剩余 1 次下载机会')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '下载文件' }))
    await act(async () => { vi.advanceTimersByTime(650) })
    expect(screen.getByText('剩余 0 次下载机会')).toBeInTheDocument()
  })
  it.each(['expired', 'exhausted'] as const)('%s 没有下载入口', (scenario) => {
    render(<ShareReceiver share={share} scenario={scenario} onBack={vi.fn()} />)
    expect(screen.queryByRole('button', { name: '下载文件' })).not.toBeInTheDocument()
    expect(createObjectURL).not.toHaveBeenCalled()
  })
  it('后台删除后当前接收页也停止下载', () => {
    const { rerender } = render(<ShareReceiver share={share} scenario="current" onBack={vi.fn()} />)
    rerender(<ShareReceiver share={share} scenario="current" deleted onBack={vi.fn()} />)
    expect(screen.getByRole('heading', { name: '分享已删除' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '下载文件' })).not.toBeInTheDocument()
  })
  it('切换演示状态后不会恢复已经耗尽的下载机会', () => {
    render(<ShareReceiver share={share} scenario="current" exhausted onBack={vi.fn()} />)
    expect(screen.getByRole('heading', { name: '下载机会已用尽' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '下载文件' })).not.toBeInTheDocument()
  })
})

describe('后台演示', () => {
  it('下载机会用尽后同步显示不可访问状态', () => {
    const { rerender } = render(<AdminPreview share={share} onDeleteCurrent={vi.fn()} />)
    rerender(<AdminPreview share={share} currentExhausted onDeleteCurrent={vi.fn()} />)
    const currentRow = screen.getByRole('button', { name: '查看 项目说明.md' }).closest('tr')
    expect(currentRow).toHaveTextContent('次数用尽')
    expect(currentRow).not.toHaveTextContent('可访问')
  })
  it('取消删除保留数据，确认删除更新数量并通知接收页', () => {
    const onDelete = vi.fn()
    render(<AdminPreview share={share} onDeleteCurrent={onDelete} />)
    fireEvent.click(screen.getByRole('button', { name: '删除 项目说明.md' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '取消' }))
    expect(screen.getByText('当前 3 条，共 3 条分享')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '删除 项目说明.md' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '确认删除' }))
    expect(screen.getByText('当前 2 条，共 2 条分享')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '查看 项目说明.md' })).not.toBeInTheDocument()
    expect(onDelete).toHaveBeenCalledOnce()
  })
})
