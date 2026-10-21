import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SVGProps } from 'react'
import { PasteCreatedContent, SuccessDialog } from '../success-dialog'
import { FileCreatedDialog } from '@/components/file-share/file-created-dialog'

vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value, role, title, 'aria-label': label }: { value: string; title?: string } & SVGProps<SVGSVGElement>) => <svg role={role} aria-label={label} data-value={value}><title>{title}</title></svg>,
}))

const url = 'https://example.com/abc123'
const managementUrl = 'https://example.com/manage/text/abc123#private-test-token'
const expiresAt = '2027-01-01T00:00:00.000Z'
const writeText = vi.fn()

beforeEach(() => {
  writeText.mockReset().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
})

describe('分享结果卡片', () => {
  it('文本成功提示展示语言、服务端到期时间、次数和密码状态，并提供查看分享入口', async () => {
    render(<SuccessDialog open onOpenChange={() => {}} url={url} managementUrl={managementUrl} language="javascript"
      expiresAt={expiresAt} viewLimit={3} hasPassword onCreateAnother={() => {}} />)

    expect(screen.getByRole('heading', { name: '链接已生成' })).toBeInTheDocument()
    expect(screen.getByText('JavaScript')).toBeInTheDocument()
    const summary = screen.getByRole('group', { name: '分享规则' })
    expect(summary).toHaveTextContent('1/1 08:00 到期（北京时间）')
    expect(summary).toHaveTextContent('3 次查看')
    expect(summary).toHaveTextContent('密码保护')
    expect(screen.getByRole('link', { name: '查看分享' })).toHaveAttribute('href', url)
    expect(screen.getByRole('img', { name: '文本分享链接二维码' })).toHaveAttribute('data-value', url)
    await waitFor(() => expect(writeText).toHaveBeenCalledOnce())
  })

  it('永久、无限次和无密码的文本分享明确说明规则，保留的卡片不会再次自动复制', async () => {
    const createAnother = vi.fn()
    render(<PasteCreatedContent url={url} managementUrl={managementUrl} language="plaintext" expiresAt={null}
      viewLimit={null} hasPassword={false} onCreateAnother={createAnother} />)

    expect(screen.getByText('纯文本')).toBeInTheDocument()
    const summary = screen.getByRole('group', { name: '分享规则' })
    expect(summary).toHaveTextContent('永不过期')
    expect(summary).toHaveTextContent('不限次数 · 无密码')
    expect(screen.getByRole('img', { name: '文本分享链接二维码' })).toHaveAttribute('data-value', url)
    expect(writeText).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '复制链接' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(url))
    fireEvent.click(screen.getByRole('button', { name: '创建另一条' }))
    expect(createAnother).toHaveBeenCalledOnce()
  })

  it('文件成功提示使用相同标题和链接操作，但不自动复制，复制失败后可重试', async () => {
    writeText.mockRejectedValueOnce(new Error('denied'))
    render(<FileCreatedDialog open onOpenChange={() => {}} fileName="项目说明.md" hasPassword={false}
      result={{ id: 'file123', url, managementUrl: 'https://example.com/manage/file/file123#private-test-token', expiresAt, downloadLimit: null }} onCreateAnother={() => {}} />)

    expect(screen.getByRole('heading', { name: '链接已生成' })).toBeInTheDocument()
    const summary = screen.getByRole('group', { name: '分享规则' })
    expect(summary).toHaveTextContent('1/1 08:00 到期（北京时间）')
    expect(summary).toHaveTextContent('不限次数 · 无密码')
    expect(screen.getByRole('link', { name: '查看分享' })).toHaveAttribute('href', url)
    expect(screen.getByRole('img', { name: '文件分享链接二维码' })).toHaveAttribute('data-value', url)
    expect(writeText).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '复制链接' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('手动复制链接')
    expect(screen.getByRole('img', { name: '文件分享链接二维码' })).toHaveAttribute('data-value', url)
    expect(screen.queryByRole('button', { name: '已复制' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '复制链接' }))
    expect(await screen.findByRole('button', { name: '已复制' })).toBeInTheDocument()
  })
})
