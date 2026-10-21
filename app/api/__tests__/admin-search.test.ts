// @vitest-environment node
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from './database'
import { pastes, fileShares, passwordAttempts, type NewPaste, type FileShare } from '@/lib/db/schema'
import { verifySession } from '@/lib/admin/session'
import { createFileShare } from '@/lib/file-share'
import { GET as listPastes } from '../admin/pastes/route'
import { GET as listFiles } from '../admin/files/route'
import { DELETE as removePaste } from '../admin/pastes/[id]/route'
import { DELETE as removeFile } from '../admin/files/[id]/route'

vi.mock('@/lib/db', async () => await import('./database'))
vi.mock('@/lib/admin/session', () => ({ verifySession: vi.fn() }))

let directory: string
const now = new Date('2026-10-21T04:00:00Z')
const future = new Date('2026-10-22T04:00:00Z')
const request = (kind: 'text' | 'file', query: Record<string, string> = {}) => new NextRequest(
  `http://localhost/api/admin/${kind === 'text' ? 'pastes' : 'files'}?${new URLSearchParams(query)}`,
)
const list = (kind: 'text' | 'file', query: Record<string, string> = {}) => (kind === 'text' ? listPastes : listFiles)(request(kind, query))
const result = async (kind: 'text' | 'file', query: Record<string, string> = {}) => (await (await list(kind, query)).json()).data
function text(id: string, overrides: Partial<NewPaste> = {}) {
  db.insert(pastes).values({ id, content: 'secret body', passwordHash: 'secret hash', iv: 'secret iv', createdAt: now, ...overrides }).run()
}
function file(id: string, overrides: Partial<FileShare> = {}) {
  db.insert(fileShares).values({ id, storageKey: `${id}.bin`, fileName: '交付说明_README.pdf', size: 100,
    createdAt: now, expiresAt: future, passwordHash: 'secret hash', ...overrides }).run()
}

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'paste-admin-search-'))
  vi.stubEnv('FILE_STORAGE_DIR', directory)
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(now)
  vi.mocked(verifySession).mockResolvedValue(true)
  db.delete(passwordAttempts).run()
  db.delete(pastes).run()
  db.delete(fileShares).run()
})
afterEach(() => {
  vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.useRealTimers()
  rmSync(directory, { recursive: true, force: true })
})

describe('后台真实数据搜索与筛选', () => {
  it.each(['text', 'file'] as const)('%s：在全部记录中筛选后分页，计数、排序和空结果一致', async (kind) => {
    for (let index = 0; index < 18; index++) {
      const id = `match-${String(index).padStart(2, '0')}`
      if (kind === 'text') text(id)
      else file(id)
    }
    if (kind === 'text') text('other', { createdAt: future })
    else file('other', { createdAt: future })
    const page = await result(kind, { q: 'match-', limit: '5', page: '2' })
    expect(page).toMatchObject({ total: 18, totalPages: 4, page: 2, pageSize: 5 })
    expect(page.items.map((item: { id: string }) => item.id)).toEqual(['match-12', 'match-11', 'match-10', 'match-09', 'match-08'])
    const found = await result(kind, { q: 'match-00', limit: '5', page: '10' })
    expect(found).toMatchObject({ total: 1, page: 1, totalPages: 1 })
    expect(found.items[0].id).toBe('match-00')
    expect(await result(kind, { q: 'not present' })).toMatchObject({ items: [], total: 0, page: 1, totalPages: 1 })
  })

  it.each(['text', 'file'] as const)('%s：ID 片段区分大小写且搜索字符按字面处理', async (kind) => {
    for (const id of ['AbC%_1', 'abc%_2', 'AbCX_3']) {
      if (kind === 'text') text(id)
      else file(id, { fileName: 'plain.txt' })
    }
    expect((await result(kind, { q: '  AbC%_  ' })).items.map((item: { id: string }) => item.id)).toEqual(['AbC%_1'])
    expect((await result(kind, { q: 'abc' })).items.map((item: { id: string }) => item.id)).toEqual(['abc%_2'])
    expect((await result(kind, { q: "' OR 1=1 --" })).items).toEqual([])
  })

  it('文件名支持中文和不区分英文大小写的字面关键词，空间统计保持全局', async () => {
    text('text-id', { language: 'README' })
    file('one', { fileName: '交付说明_100%_README.pdf' })
    file('two', { fileName: '交付说明_100X_README.pdf' })
    file('three', { fileName: '其他.txt' })
    writeFileSync(join(directory, 'one.bin'), Buffer.alloc(128))
    writeFileSync(join(directory, 'two.bin'), Buffer.alloc(256))
    const found = await result('file', { q: '100%_readme' })
    expect(found.items.map((item: { id: string }) => item.id)).toEqual(['one'])
    expect(found.storage.usedBytes).toBe(384)
    expect((await result('file', { q: '交付说明' })).total).toBe(2)
    expect((await result('text', { q: 'secret body' })).total).toBe(0)
    expect((await result('text', { q: 'README' })).total).toBe(0)
  })

  it('文本状态按过期、次数用尽、可访问的优先级筛选', async () => {
    text('active-unlimited')
    text('active-limited', { expiresAt: future, burnCount: 2 })
    text('exhausted', { burnCount: 0 })
    text('expired', { expiresAt: now, burnCount: 0 })
    expect((await result('text', { status: 'active' })).items.map((item: { id: string }) => item.id)).toEqual(['active-unlimited', 'active-limited'])
    expect((await result('text', { status: 'destroyed' })).items).toEqual([expect.objectContaining({ id: 'exhausted', status: 'destroyed' })])
    expect((await result('text', { status: 'expired' })).items).toEqual([expect.objectContaining({ id: 'expired', status: 'expired' })])
  })

  it('文件清理状态优先，过期和次数用尽不会混入可访问', async () => {
    file('active-unlimited')
    file('active-limited', { downloadsRemaining: 2 })
    file('expired', { expiresAt: now, downloadsRemaining: 0 })
    file('exhausted', { downloadsRemaining: 0 })
    file('pending', { status: 'pending_delete', expiresAt: now, downloadsRemaining: 0 })
    file('failed', { status: 'delete_failed', expiresAt: now, downloadsRemaining: 0 })
    for (const [status, ids] of [
      ['active', ['active-unlimited', 'active-limited']], ['expired', ['expired']], ['exhausted', ['exhausted']],
      ['pending_delete', ['pending']], ['delete_failed', ['failed']],
    ] as const) {
      expect((await result('file', { status })).items.map((item: { id: string }) => item.id)).toEqual(ids)
    }
  })

  it.each(['text', 'file'] as const)('%s：创建日期按北京时间的完整同日边界筛选，支持单端', async (kind) => {
    for (const [id, createdAt] of [
      ['before', '2026-10-20T15:59:59Z'], ['start', '2026-10-20T16:00:00Z'],
      ['end', '2026-10-21T15:59:59Z'], ['after', '2026-10-21T16:00:00Z'],
    ]) {
      if (kind === 'text') text(id, { createdAt: new Date(createdAt) })
      else file(id, { createdAt: new Date(createdAt) })
    }
    const from = '2026-10-21T00:00:00+08:00'
    const before = '2026-10-22T00:00:00+08:00'
    expect((await result(kind, { createdFrom: from, createdBefore: before })).items.map((item: { id: string }) => item.id)).toEqual(['end', 'start'])
    expect((await result(kind, { createdFrom: from })).total).toBe(3)
    expect((await result(kind, { createdBefore: before })).total).toBe(3)
    expect((await result(kind, { createdFrom: '2026-10-20T16:00:00.001Z', createdBefore: before })).items.map((item: { id: string }) => item.id)).toEqual(['end'])
  })

  it.each(['text', 'file'] as const)('%s：关键词、状态和日期共同限制结果', async (kind) => {
    const create = (id: string, active: boolean, createdAt: Date) => kind === 'text'
      ? text(id, { expiresAt: active ? future : now, createdAt })
      : file(id, { expiresAt: active ? future : now, createdAt })
    create('match-good', true, now)
    create('match-expired', false, now)
    create('match-old', true, new Date('2026-10-01T00:00:00Z'))
    create('different', true, now)
    const found = await result(kind, { q: 'match', status: 'active', createdFrom: '2026-10-20T16:00:00Z', createdBefore: '2026-10-21T16:00:00Z' })
    expect(found.total).toBe(1)
    expect(found.items[0].id).toBe('match-good')
  })

  it.each(['text', 'file'] as const)('%s：非法状态、日期或反向范围返回明确的参数错误', async (kind) => {
    const queries: Record<string, string>[] = [
      { status: 'unknown' }, { status: kind === 'text' ? 'delete_failed' : 'destroyed' },
      { createdFrom: 'not-a-date' }, { createdBefore: '' },
      { createdFrom: '2026-10-21' }, { createdFrom: '2026-10-21T00:00:00' },
      { createdFrom: '2026-02-30T00:00:00Z' }, { createdBefore: '2026-10-21T24:00:00Z' },
      { createdFrom: '2026-10-22T00:00:00Z', createdBefore: '2026-10-21T00:00:00Z' },
      { createdFrom: '2026-10-21T00:00:00Z', createdBefore: '2026-10-21T00:00:00Z' },
    ]
    for (const query of queries) {
      const response = await list(kind, query)
      expect(response.status, JSON.stringify(query)).toBe(400)
      expect(await response.json()).toMatchObject({ success: false, error: { code: 'VALIDATION_ERROR' } })
    }
  })

  it('无筛选保持原分页，鉴权先于参数处理，列表不泄露敏感字段', async () => {
    text('one')
    file('two')
    for (const kind of ['text', 'file'] as const) {
      const found = await result(kind)
      expect(found).toMatchObject({ total: 1, page: 1, totalPages: 1, pageSize: 15 })
      for (const field of ['content', 'iv', 'storageKey', 'passwordHash']) expect(found.items[0]).not.toHaveProperty(field)
      vi.mocked(verifySession).mockResolvedValueOnce(false)
      expect((await list(kind, { status: 'invalid' })).status).toBe(401)
    }
  })

  it('筛选后删除末页记录，重新查询回到有效页且保留条件', async () => {
    text('match-a'); text('match-b'); text('other')
    const last = await result('text', { q: 'match', page: '2', limit: '1' })
    expect(last).toMatchObject({ total: 2, page: 2 })
    expect((await removePaste(request('text'), { params: Promise.resolve({ id: last.items[0].id }) })).status).toBe(200)
    expect(await result('text', { q: 'match', page: '2', limit: '1' })).toMatchObject({ total: 1, page: 1, totalPages: 1 })
    expect(db.select().from(pastes).where(eq(pastes.id, 'other')).get()).toBeDefined()
  })

  it('文件筛选后删除末页记录，页码和全局占用同步更新', async () => {
    vi.stubEnv('ENCRYPTION_KEY', 'b'.repeat(64))
    for (const fileName of ['match-a.txt', 'match-b.txt', 'other.txt']) {
      await createFileShare({ fileName, bytes: Buffer.from('file content') })
    }
    const last = await result('file', { q: 'match', page: '2', limit: '1' })
    expect(last).toMatchObject({ total: 2, page: 2 })
    expect((await removeFile(request('file'), { params: Promise.resolve({ id: last.items[0].id }) })).status).toBe(200)
    const after = await result('file', { q: 'match', page: '2', limit: '1' })
    expect(after).toMatchObject({ total: 1, page: 1, totalPages: 1 })
    expect(after.storage.usedBytes).toBe((Buffer.byteLength('file content') + 28) * 2)
    expect((await result('file')).total).toBe(2)
  })
})
