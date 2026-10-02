import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { PasteDetailModal } from '../paste-detail-modal'

const fetchMock = vi.fn<typeof fetch>()
const onOpenChange = vi.fn()

function detail(id = 'one', content = '正文') {
  return Response.json({ success: true, data: { id, content, language: 'plaintext', createdAt: '2026-10-02T12:00:00Z', expiresAt: null, burnCount: null, status: 'active', hasPassword: false } })
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('PasteDetailModal', () => {
  it('404 响应结束加载，并能重试获取详情', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ success: false, error: { code: 'NOT_FOUND', message: '分享不存在' } }, { status: 404 })).mockResolvedValueOnce(detail())
    render(<PasteDetailModal pasteId="one" open onOpenChange={onOpenChange} />)
    expect(await screen.findByRole('alert')).toHaveTextContent('分享不存在')
    expect(screen.queryByText('正在加载详情…')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '重试' }))
    expect(await screen.findByText('正文')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toHaveAccessibleDescription('查看这条分享的内容、状态与访问选项。')
  })

  it('关闭后重新打开同一记录时重新读取内容', async () => {
    fetchMock.mockResolvedValueOnce(detail('one', '旧内容')).mockResolvedValueOnce(detail('one', '新内容'))
    const { rerender } = render(<PasteDetailModal pasteId="one" open onOpenChange={onOpenChange} />)
    await screen.findByText('旧内容')
    rerender(<PasteDetailModal pasteId="one" open={false} onOpenChange={onOpenChange} />)
    rerender(<PasteDetailModal pasteId="one" open onOpenChange={onOpenChange} />)
    expect(await screen.findByText('新内容')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('切换记录后取消旧请求，旧响应不覆盖当前详情', async () => {
    let resolveOld: (value: Response) => void = () => {}
    let oldSignal: AbortSignal | undefined
    fetchMock.mockImplementationOnce(async (_url, options) => {
      oldSignal = options?.signal ?? undefined
      return new Promise<Response>((resolve) => { resolveOld = resolve })
    }).mockResolvedValueOnce(detail('two', '第二条正文'))
    const { rerender } = render(<PasteDetailModal pasteId="one" open onOpenChange={onOpenChange} />)
    rerender(<PasteDetailModal pasteId="two" open onOpenChange={onOpenChange} />)
    await screen.findByText('第二条正文')
    await act(async () => { resolveOld(detail('one', '第一条正文')) })
    expect(oldSignal?.aborted).toBe(true)
    expect(screen.queryByText('第一条正文')).not.toBeInTheDocument()
    expect(screen.getByText('第二条正文')).toBeInTheDocument()
  })
})
