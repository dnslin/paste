import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

const { getRecord, decryptPaste, fileProps, textProps } = vi.hoisted(() => ({
  getRecord: vi.fn(), decryptPaste: vi.fn(), fileProps: vi.fn(), textProps: vi.fn(),
}))
vi.mock('@/lib/db', () => ({ db: { select: () => ({ from: () => ({ where: () => ({ get: getRecord }) }) }) } }))
vi.mock('@/lib/db/schema', () => ({ pastes: { id: 'id' } }))
vi.mock('drizzle-orm', () => ({ eq: vi.fn() }))
vi.mock('@/lib/paste', () => ({ decryptPaste, getPasteStatus: (paste: { burnCount: number | null }) => paste.burnCount === 0 ? 'destroyed' : 'active' }))
vi.mock('@/components/files/file-viewer', () => ({ FileViewer: (props: unknown) => { fileProps(props); return <p>file viewer</p> } }))
vi.mock('@/components/paste/paste-viewer', () => ({ PasteViewer: (props: unknown) => { textProps(props); return <p>text viewer</p> } }))
import PastePage, { generateMetadata } from '../../../../app/[id]/page'

beforeEach(() => { vi.clearAllMocks() })
afterEach(cleanup)

describe('公开文件页面', () => {
  it.each([0, 1])('仅传安全公共字段，剩余 %s 次时均走文件分支', async (burnCount) => {
    getRecord.mockReturnValue({ id: 'one', kind: 'file', content: 'secret ciphertext', passwordHash: 'private hash', language: 'secret-type', fileName: 'sensitive-name.pdf', storageKey: 'private-path', burnCount })
    render(await PastePage({ params: Promise.resolve({ id: 'one' }) }))
    expect(screen.getByText('file viewer')).toBeInTheDocument()
    expect(decryptPaste).not.toHaveBeenCalled()
    expect(fileProps).toHaveBeenCalledWith({ pasteId: 'one', initialStatus: burnCount === 0 ? 'destroyed' : 'active', hasPassword: true, burnCount })
    expect(textProps).not.toHaveBeenCalled()
  })

  it('旧的无限次无密码文本继续预渲染，元信息禁止发送 Referrer', async () => {
    getRecord.mockReturnValue({ id: 'one', kind: 'text', content: 'ciphertext', passwordHash: null, language: 'plaintext', burnCount: null })
    decryptPaste.mockReturnValue('original text')
    render(await PastePage({ params: Promise.resolve({ id: 'one' }) }))
    expect(textProps.mock.calls[0][0].initialContent).toBe('original text')
    expect(fileProps).not.toHaveBeenCalled()
    expect(await generateMetadata({ params: Promise.resolve({ id: 'one' }) })).toMatchObject({ referrer: 'no-referrer' })
  })
})
