import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SVGProps } from 'react'
import { ShareCreatedContent } from '../share-created-content'

vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value, role, title, 'aria-label': label }: { value: string; title?: string } & SVGProps<SVGSVGElement>) => <svg role={role} aria-label={label} data-value={value}><title>{title}</title></svg>,
}))

const writeText = vi.fn()
const fetchMock = vi.fn()
const textUrl = 'https://share.example.com/pastes/text123?source=create&name=%E9%A1%B9%E7%9B%AE#part-2'
const fileUrl = 'https://files.example.com/f/file456?source=upload&name=%E6%96%87%E6%A1%A3#download'

beforeEach(() => {
  writeText.mockReset().mockResolvedValue(undefined)
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
})

describe('共享创建结果', () => {
  it.each(['text', 'file'] as const)('%s 独立保存管理链接，二维码和自动复制只包含公开分享链接', async (kind) => {
    const url = kind === 'text' ? textUrl : fileUrl
    const managementUrl = `https://share.example.com/manage/${kind}/share123#private-management-token`
    render(<ShareCreatedContent url={url} managementUrl={managementUrl} name="分享摘要" kind={kind}
      expiresAt={null} limit={1} hasPassword autoCopy={kind === 'text'} onCreateAnother={() => {}} />)

    const management = screen.getByRole('region', { name: '私人管理链接' })
    expect(management).toHaveTextContent('请勿发给接收者')
    expect(management).toHaveTextContent('丢失后无法自行找回')
    expect(screen.getByRole('link', { name: '进入管理页' })).toHaveAttribute('href', managementUrl)
    expect(screen.getByRole('link', { name: managementUrl })).toHaveAttribute('href', managementUrl)
    expect(screen.getAllByRole('img')).toHaveLength(1)
    expect(screen.getByRole('img')).toHaveAttribute('data-value', url)
    if (kind === 'text') await waitFor(() => expect(writeText.mock.calls).toEqual([[url]]))
    else expect(writeText).not.toHaveBeenCalled()

    writeText.mockRejectedValueOnce(new Error('denied'))
    fireEvent.click(screen.getByRole('button', { name: '复制管理链接' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('手动复制管理链接')
    expect(screen.getByRole('img')).toHaveAttribute('data-value', url)
    fireEvent.click(screen.getByRole('button', { name: '复制管理链接' }))
    await screen.findByRole('button', { name: '管理链接已复制' })
    expect(writeText).toHaveBeenLastCalledWith(managementUrl)
    expect(screen.getByRole('button', { name: kind === 'text' ? '已复制' : '复制链接' })).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    { kind: 'text', name: 'TypeScript', url: textUrl, label: '文本分享链接二维码', limitLabel: '2 次查看' },
    { kind: 'file', name: '项目说明.md', url: fileUrl, label: '文件分享链接二维码', limitLabel: '2 次下载' },
  ] as const)('$kind 的二维码、链接和手动复制使用同一完整 URL，密码单独提示', async ({ kind, name, url, label, limitLabel }) => {
    render(<ShareCreatedContent url={url} name={name} kind={kind} expiresAt={null}
      limit={2} hasPassword onCreateAnother={() => {}} />)

    expect(screen.getByText(name)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: label })).toHaveAttribute('data-value', url)
    expect(screen.getByRole('link', { name: url })).toHaveAttribute('href', url)
    expect(screen.getByRole('link', { name: '查看分享' })).toHaveAttribute('href', url)
    const rules = screen.getByRole('group', { name: '分享规则' })
    expect(rules).toHaveTextContent('永不过期')
    expect(rules).toHaveTextContent(limitLabel)
    expect(rules).toHaveTextContent('密码保护 · 密码请单独提供')
    expect(writeText).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: '复制链接' }))
    expect(await screen.findByRole('button', { name: '已复制' })).toBeInTheDocument()
    expect(writeText).toHaveBeenCalledOnce()
    expect(writeText).toHaveBeenCalledWith(url)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('自动复制只在启用时执行，同一链接重新渲染不会重复复制', async () => {
    const { rerender } = render(<ShareCreatedContent url={textUrl} name="纯文本" kind="text" expiresAt={null}
      limit={null} hasPassword={false} autoCopy onCreateAnother={() => {}} />)
    await waitFor(() => expect(writeText).toHaveBeenCalledOnce())

    rerender(<ShareCreatedContent url={textUrl} name="TypeScript" kind="text" expiresAt={null}
      limit={2} hasPassword autoCopy onCreateAnother={() => {}} />)
    expect(writeText).toHaveBeenCalledOnce()
    expect(writeText).toHaveBeenCalledWith(textUrl)
    expect(screen.getByRole('img', { name: '文本分享链接二维码' })).toHaveAttribute('data-value', textUrl)
  })

  it('切换 URL 和分享类型时更新二维码，旧链接的复制成功状态不传给新链接', async () => {
    const { rerender } = render(<ShareCreatedContent url={textUrl} name="纯文本" kind="text" expiresAt={null}
      limit={null} hasPassword={false} onCreateAnother={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: '复制链接' }))
    await screen.findByRole('button', { name: '已复制' })

    rerender(<ShareCreatedContent url={fileUrl} name="项目说明.md" kind="file" expiresAt={null}
      limit={3} hasPassword={false} onCreateAnother={() => {}} />)
    expect(screen.queryByRole('img', { name: '文本分享链接二维码' })).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: '文件分享链接二维码' })).toHaveAttribute('data-value', fileUrl)
    expect(screen.queryByRole('link', { name: textUrl })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '已复制' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: '查看分享' })).toHaveAttribute('href', fileUrl)
    fireEvent.click(screen.getByRole('button', { name: '复制链接' }))
    await screen.findByRole('button', { name: '已复制' })
    expect(writeText.mock.calls).toEqual([[textUrl], [fileUrl]])
  })

  it('上一条链接的迟到复制结果不会给新二维码显示复制成功', async () => {
    let finishPreviousCopy!: () => void
    writeText.mockImplementationOnce(() => new Promise<void>((resolve) => { finishPreviousCopy = resolve }))
    const { rerender } = render(<ShareCreatedContent url={textUrl} name="纯文本" kind="text" expiresAt={null}
      limit={null} hasPassword={false} onCreateAnother={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: '复制链接' }))

    rerender(<ShareCreatedContent url={fileUrl} name="项目说明.md" kind="file" expiresAt={null}
      limit={null} hasPassword={false} onCreateAnother={() => {}} />)
    await act(async () => { finishPreviousCopy() })
    expect(screen.getByRole('img', { name: '文件分享链接二维码' })).toHaveAttribute('data-value', fileUrl)
    expect(screen.getByRole('button', { name: '复制链接' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '已复制' })).not.toBeInTheDocument()
  })

  it('复制失败时保留二维码和完整 URL，重试仍复制同一链接', async () => {
    writeText.mockRejectedValueOnce(new Error('clipboard unavailable'))
    render(<ShareCreatedContent url={fileUrl} name="项目说明.md" kind="file" expiresAt={null}
      limit={null} hasPassword onCreateAnother={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: '复制链接' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('请重试或手动复制链接')
    expect(screen.getByRole('img', { name: '文件分享链接二维码' })).toHaveAttribute('data-value', fileUrl)
    expect(screen.getByRole('link', { name: fileUrl })).toHaveAttribute('href', fileUrl)

    fireEvent.click(screen.getByRole('button', { name: '复制链接' }))
    await screen.findByRole('button', { name: '已复制' })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(writeText.mock.calls).toEqual([[fileUrl], [fileUrl]])
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
