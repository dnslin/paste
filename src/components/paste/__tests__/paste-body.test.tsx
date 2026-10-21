import { Blob as NodeBlob } from 'node:buffer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { PasteBody } from '../paste-body'

vi.mock('../code-display', () => ({
  CodeDisplay: ({ code }: { code: string }) => <pre>{code}</pre>,
}))

const content = '  原始正文：<>&\r\n\r\n\t保留缩进\r\n'
const props = { pasteId: 'abc123', content, language: 'json' }
const createObjectURL = vi.fn<(blob: Blob) => string>(() => 'blob:original')
const revokeObjectURL = vi.fn()
const fetchMock = vi.fn()
const writeText = vi.fn()
let downloads: { fileName: string; href: string }[]

beforeEach(() => {
  downloads = []
  createObjectURL.mockReset().mockReturnValue('blob:original')
  revokeObjectURL.mockReset()
  fetchMock.mockReset()
  writeText.mockReset().mockResolvedValue(undefined)
  vi.stubGlobal('Blob', NodeBlob)
  vi.stubGlobal('fetch', fetchMock)
  vi.stubGlobal('URL', class extends URL {
    static createObjectURL = createObjectURL
    static revokeObjectURL = revokeObjectURL
  })
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    downloads.push({ fileName: this.download, href: this.href })
  })
})

afterEach(() => {
  cleanup()
  expect(fetchMock).not.toHaveBeenCalled()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function download() {
  fireEvent.click(screen.getByRole('button', { name: '下载原文' }))
}

describe('已领取正文的本地下载', () => {
  it('saves the original UTF-8 bytes without a BOM or formatting changes', async () => {
    render(<PasteBody {...props} />)
    download()
    const blob = createObjectURL.mock.calls[0][0]
    const bytes = new Uint8Array(await blob.arrayBuffer())
    expect([...bytes]).toEqual([...new TextEncoder().encode(content)])
    expect([...bytes.slice(0, 3)]).not.toEqual([0xef, 0xbb, 0xbf])
    expect(blob.type).toBe('text/plain;charset=utf-8')
    expect(downloads).toEqual([{ fileName: 'paste-abc123.json', href: 'blob:original' }])
    expect(document.querySelector('a[download]')).toBeNull()
    expect(screen.getByRole('status', { name: '下载状态' })).toHaveTextContent('已发起下载 · paste-abc123.json')
  })

  it('keeps original content when toggling display wrapping or downloading again', async () => {
    render(<PasteBody {...props} />)
    download()
    fireEvent.click(screen.getByRole('checkbox', { name: '长行换行' }))
    expect(screen.getByRole('checkbox', { name: '长行换行' })).toBeChecked()
    download()
    expect(downloads).toHaveLength(2)
    for (const [blob] of createObjectURL.mock.calls) expect(await blob.text()).toBe(content)
  })

  it('releases each replaced URL and releases the final URL on unmount', () => {
    createObjectURL.mockReturnValueOnce('blob:first').mockReturnValueOnce('blob:second')
    const { unmount } = render(<PasteBody {...props} />)
    download()
    download()
    expect(revokeObjectURL.mock.calls).toEqual([['blob:first']])
    unmount()
    expect(revokeObjectURL.mock.calls).toEqual([['blob:first'], ['blob:second']])
  })

  it.each([
    { pasteId: 'new123' }, { content: '新正文\n' }, { language: 'sql' },
  ])('clears old URLs and feedback when source props change: %j', async (changed) => {
    const { rerender } = render(<PasteBody {...props} />)
    download()
    rerender(<PasteBody {...props} {...changed} />)
    expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:original')
    expect(screen.getByRole('status', { name: '下载状态' })).toBeEmptyDOMElement()
    download()
    const latest = { ...props, ...changed }
    expect(await createObjectURL.mock.calls.at(-1)![0].text()).toBe(latest.content)
    expect(downloads.at(-1)?.fileName).toBe(`paste-${latest.pasteId}.${latest.language === 'sql' ? 'sql' : 'json'}`)
  })

  it('allows retry after preparation failure and keeps copying available', async () => {
    createObjectURL.mockImplementationOnce(() => { throw new Error('cannot create Blob URL') })
    render(<PasteBody {...props} />)
    download()
    expect(screen.getByRole('alert')).toHaveTextContent('下载未能发起，请重试。')
    expect(document.querySelector('pre')?.textContent).toBe(content)
    fireEvent.click(screen.getByRole('button', { name: '复制内容' }))
    expect(await screen.findByRole('button', { name: '已复制' })).toBeInTheDocument()
    expect(writeText).toHaveBeenCalledExactlyOnceWith(content)
    download()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(downloads).toHaveLength(1)
  })

  it('removes the temporary anchor if browser download dispatch throws and can retry', () => {
    vi.mocked(HTMLAnchorElement.prototype.click).mockImplementationOnce(() => { throw new Error('dispatch denied') })
    render(<PasteBody {...props} />)
    download()
    expect(screen.getByRole('alert')).toHaveTextContent('下载未能发起')
    expect(document.querySelector('a[download]')).toBeNull()
    download()
    expect(downloads).toHaveLength(1)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
