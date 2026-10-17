import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ShareRecords } from '../share-records'

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockReset()
  HTMLElement.prototype.scrollIntoView = vi.fn()
  fetchMock.mockImplementation(async (url) => {
    const request = new URL(String(url), 'http://localhost')
    const page = Number(request.searchParams.get('page'))
    const pageSize = Number(request.searchParams.get('limit'))
    const file = request.pathname.endsWith('/files')
    return Response.json({ success: true, data: {
      items: file ? [{ id: `file-${page}`, fileName: `文件-${page}.txt`, size: 1024, createdAt: '2026-10-17T01:00:00Z', expiresAt: '2026-10-18T01:00:00Z', downloadsRemaining: 3, hasPassword: false, status: 'active', cleanupStatus: 'active' }]
        : [{ id: `paste-${page}`, createdAt: '2026-10-17T01:00:00Z', language: 'plaintext', status: 'active', hasPassword: false }],
      total: 60, page, pageSize, totalPages: Math.ceil(60 / pageSize),
      ...(file ? { storage: { usedBytes: 1024, reservedBytes: 0, limitBytes: 1024 * 1024 } } : {}),
    } })
  })
})

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

function selectTab(name: string) {
  fireEvent.keyDown(screen.getByRole('tab', { name }), { key: 'Enter' })
}

async function choosePageSize(size: number) {
  fireEvent.keyDown(screen.getByRole('combobox', { name: '每页条数' }), { key: 'ArrowDown' })
  fireEvent.keyDown(await screen.findByRole('option', { name: String(size) }), { key: 'Enter' })
}

describe('分享记录页签', () => {
  it('按需加载文件列表，来回切换保留各自页码与每页数且不重复请求', async () => {
    render(<ShareRecords />)
    await screen.findByText('paste-1')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await choosePageSize(10)
    await screen.findByText('第 1–10 条，共 60 条')
    fireEvent.click(screen.getByRole('button', { name: '下一页' }))
    await screen.findByText('paste-2')

    selectTab('文件')
    await screen.findByText('文件-1.txt')
    await choosePageSize(20)
    await screen.findByText('第 1–20 条，共 60 条')
    fireEvent.click(screen.getByRole('button', { name: '下一页' }))
    await screen.findByText('文件-2.txt')
    const requestCount = fetchMock.mock.calls.length

    selectTab('文本 / 代码')
    expect(screen.getByText('paste-2')).toBeVisible()
    expect(screen.getByRole('combobox', { name: '每页条数' })).toHaveTextContent('10')
    expect(screen.getByText('第 11–20 条，共 60 条')).toBeVisible()
    expect(screen.queryByRole('button', { name: '查看 文件-2.txt' })).not.toBeInTheDocument()

    selectTab('文件')
    expect(screen.getByText('文件-2.txt')).toBeVisible()
    expect(screen.getByRole('combobox', { name: '每页条数' })).toHaveTextContent('20')
    expect(screen.getByText('第 21–40 条，共 60 条')).toBeVisible()
    expect(screen.queryByRole('button', { name: '查看 paste-2' })).not.toBeInTheDocument()
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(requestCount))

    const panels = screen.getAllByRole('tabpanel', { hidden: true })
    const labelIds = panels.map(panel => within(panel).getByText('每页条数').id)
    expect(new Set(labelIds).size).toBe(2)
  })
})
