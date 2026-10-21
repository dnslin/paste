import { Blob as NodeBlob } from 'node:buffer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { TextDownloadPrototype } from '../text-download-prototype'
import { examples } from '../model'

vi.mock('@/components/paste/code-display', () => ({
  CodeDisplay: ({ code }: { code: string }) => <pre data-testid="body">{code}</pre>,
}))

const fetchMock = vi.fn()
const createObjectURL = vi.fn<(blob: Blob) => string>(() => 'blob:original-text')
const revokeObjectURL = vi.fn()
let downloads: { name: string; href: string }[]

beforeEach(() => {
  downloads = []
  createObjectURL.mockReset().mockReturnValue('blob:original-text')
  revokeObjectURL.mockReset()
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  vi.stubGlobal('Blob', NodeBlob)
  vi.stubGlobal('URL', class extends URL {
    static createObjectURL = createObjectURL
    static revokeObjectURL = revokeObjectURL
  })
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    downloads.push({ name: this.download, href: this.href })
  })
})

afterEach(() => {
  cleanup()
  expect(fetchMock).not.toHaveBeenCalled()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function scenario(value: string) {
  fireEvent.change(screen.getByLabelText('演示状态'), { target: { value } })
}

function download() {
  fireEvent.click(screen.getByRole('button', { name: '下载原文' }))
}

describe('下载文本原文原型', () => {
  it('downloads already claimed JSON without another claim or count change', async () => {
    render(<TextDownloadPrototype />)
    expect(screen.getByText('还可查看 2 次')).toBeInTheDocument()
    download()
    download()
    expect(downloads).toEqual([
      { name: 'paste-n7Kp2xQm.json', href: 'blob:original-text' },
      { name: 'paste-n7Kp2xQm.json', href: 'blob:original-text' },
    ])
    const blob = createObjectURL.mock.calls[0][0]
    expect(await blob.text()).toBe(examples[0].content)
    expect(blob.type).toBe('text/plain;charset=utf-8')
    expect(screen.getByText('还可查看 2 次')).toBeInTheDocument()
    expect(screen.getByRole('status', { name: '下载状态' })).toHaveTextContent('已发起下载')
  })

  it('requires a valid password before exposing the body and download', () => {
    render(<TextDownloadPrototype />)
    scenario('protected')
    expect(screen.queryByTestId('body')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '下载原文' })).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('访问密码'), { target: { value: 'wrong-password' } })
    fireEvent.click(screen.getByRole('button', { name: '解锁内容' }))
    expect(screen.getByRole('alert')).toHaveTextContent('密码不正确')
    expect(screen.getByText('剩余 2 次，查看后扣 1 次。')).toBeInTheDocument()
    expect(createObjectURL).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText('访问密码'), { target: { value: 'paste-demo' } })
    fireEvent.click(screen.getByRole('button', { name: '解锁内容' }))
    expect(screen.getByText('还可查看 1 次')).toBeInTheDocument()
    download()
    expect(screen.getByText('还可查看 1 次')).toBeInTheDocument()
  })

  it('claims once before downloading a limited public share', () => {
    render(<TextDownloadPrototype />)
    scenario('limited')
    expect(screen.queryByRole('button', { name: '下载原文' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '查看内容' }))
    download()
    expect(screen.getByText('还可查看 2 次')).toBeInTheDocument()
  })

  it('keeps downloads available on the last view but rejects a simulated reopen', () => {
    render(<TextDownloadPrototype />)
    scenario('last')
    fireEvent.click(screen.getByRole('button', { name: '查看内容' }))
    download()
    download()
    expect(downloads).toHaveLength(2)
    expect(screen.getByText('这是最后一次查看，当前页面仍可阅读、复制和下载。')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '模拟重新打开链接' }))
    expect(screen.getByRole('heading', { name: '查看次数已用完' })).toBeInTheDocument()
    expect(screen.queryByTestId('body')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '下载原文' })).not.toBeInTheDocument()
  })

  it.each(['expired', 'destroyed'])('offers no download for unavailable state %s', (value) => {
    render(<TextDownloadPrototype />)
    scenario(value)
    expect(screen.queryByRole('button', { name: '下载原文' })).not.toBeInTheDocument()
    expect(screen.queryByTestId('body')).not.toBeInTheDocument()
    expect(createObjectURL).not.toHaveBeenCalled()
  })

  it('allows unlimited initial content to download without an access form', () => {
    render(<TextDownloadPrototype />)
    scenario('unlimited')
    expect(screen.queryByRole('button', { name: '查看内容' })).not.toBeInTheDocument()
    download()
    fireEvent.click(screen.getByRole('button', { name: '模拟重新打开链接' }))
    download()
    expect(downloads).toHaveLength(2)
  })

  it('uses matching extensions and preserves original text when display wrapping changes', async () => {
    render(<TextDownloadPrototype />)
    for (const [value, extension] of [['sql', 'sql'], ['yaml', 'yaml'], ['nginx', 'conf'], ['plaintext', 'txt']]) {
      fireEvent.change(screen.getByLabelText('内容示例'), { target: { value } })
      fireEvent.click(screen.getByRole('checkbox', { name: '长行换行' }))
      download()
      expect(downloads.at(-1)?.name).toBe(`paste-n7Kp2xQm.${extension}`)
      const blob = createObjectURL.mock.calls.at(-1)![0]
      expect(await blob.text()).toBe(examples.find((example) => example.language === value)!.content)
    }
    const plain = createObjectURL.mock.calls.at(-1)![0]
    expect(await plain.text()).toContain('\r\n')
    expect(await plain.text()).toContain('<>&')
  })

  it('keeps the body and quota when local download preparation fails and allows retry', () => {
    render(<TextDownloadPrototype />)
    createObjectURL.mockImplementationOnce(() => { throw new Error('download unavailable') })
    download()
    expect(screen.getByRole('alert')).toHaveTextContent('下载未能发起')
    expect(screen.getByTestId('body')).toBeInTheDocument()
    expect(screen.getByText('还可查看 2 次')).toBeInTheDocument()
    download()
    expect(downloads).toHaveLength(1)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('releases blob URLs when the content changes or component unmounts', () => {
    const view = render(<TextDownloadPrototype />)
    download()
    fireEvent.change(screen.getByLabelText('内容示例'), { target: { value: 'sql' } })
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:original-text')
    download()
    view.unmount()
    expect(revokeObjectURL).toHaveBeenCalledTimes(2)
  })
})
