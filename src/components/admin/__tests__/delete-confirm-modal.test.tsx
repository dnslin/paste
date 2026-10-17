import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DeleteConfirmModal } from '../delete-confirm-modal'

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock) })
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('删除确认对象', () => {
  it('显示当前编号，取消不删除；切换对象后确认只删除新编号', async () => {
    const onOpenChange = vi.fn()
    const onConfirm = vi.fn()
    fetchMock.mockResolvedValue(Response.json({ success: true, data: { message: '已删除' } }))
    const { rerender } = render(<DeleteConfirmModal pasteId="first123" open onOpenChange={onOpenChange} onConfirm={onConfirm} />)
    expect(within(screen.getByRole('dialog')).getByText('first123')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: '取消' }))
    expect(fetchMock).not.toHaveBeenCalled()
    expect(onOpenChange).toHaveBeenCalledWith(false)

    rerender(<DeleteConfirmModal pasteId="second456" open onOpenChange={onOpenChange} onConfirm={onConfirm} />)
    expect(within(screen.getByRole('dialog')).getByText('second456')).toBeVisible()
    expect(screen.queryByText('first123')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '删除' }))
    await waitFor(() => expect(onConfirm).toHaveBeenCalledOnce())
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith('/api/admin/pastes/second456', { method: 'DELETE' })
  })
})
