// @vitest-environment node
import { mkdtempSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from './database'
import { fileShares, passwordAttempts, pastes } from '@/lib/db/schema'
import { verifySession } from '@/lib/admin/session'
import { createFileShare } from '@/lib/file-share'
import { GET as list } from '../admin/files/route'
import { DELETE as remove } from '../admin/files/[id]/route'
import { POST as cleanup } from '../admin/files/cleanup/route'
import { GET as stats } from '../admin/stats/route'
import { DELETE as removeText } from '../admin/pastes/[id]/route'

vi.mock('@/lib/db', async () => await import('./database'))
vi.mock('@/lib/admin/session', () => ({ verifySession: vi.fn() }))

let directory: string
const context = (id: string) => ({ params: Promise.resolve({ id }) })
const request = (query = '') => new NextRequest(`http://localhost/api/admin/files${query}`)
const seed = (fileName = '交付说明.md') => createFileShare({ fileName, bytes: Buffer.from('文件内容'), downloadLimit: 1 })

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'paste-admin-files-'))
  vi.stubEnv('FILE_STORAGE_DIR', join(directory, 'files'))
  vi.stubEnv('ENCRYPTION_KEY', 'b'.repeat(64))
  vi.mocked(verifySession).mockResolvedValue(true)
  db.delete(fileShares).run()
  db.delete(passwordAttempts).run()
  db.delete(pastes).run()
})
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); rmSync(directory, { recursive: true, force: true }) })

describe('后台文件管理', () => {
  it('未登录不能枚举、删除或清理文件，也不创建存储目录', async () => {
    vi.mocked(verifySession).mockResolvedValue(false)
    expect((await list(request())).status).toBe(401)
    expect((await remove(request(), context('unknown'))).status).toBe(401)
    expect((await cleanup()).status).toBe(401)
    expect(existsSync(join(directory, 'files'))).toBe(false)
  })

  it('分页返回真实占用，删除末页记录后页码回到有效范围', async () => {
    await seed('a.txt')
    await seed('b.txt')
    const page = await (await list(request('?page=2&limit=1'))).json()
    expect(page.data).toMatchObject({ total: 2, page: 2, totalPages: 2, pageSize: 1 })
    expect(page.data.storage.usedBytes).toBe(Buffer.byteLength('文件内容') * 2 + 56)
    expect(page.data.items[0]).not.toHaveProperty('storageKey')
    expect(page.data.items[0]).not.toHaveProperty('passwordHash')
    expect((await remove(request(), context(page.data.items[0].id))).status).toBe(200)
    expect((await (await list(request('?page=2&limit=1'))).json()).data).toMatchObject({ total: 1, page: 1, totalPages: 1 })
    expect((await list(request('?limit=1000'))).status).toBe(400)
  })

  it('删除失败保留待重试状态，重试成功后才移除元数据', async () => {
    const { id } = await seed()
    db.$client.exec("CREATE TRIGGER fail_file_delete BEFORE DELETE ON file_shares BEGIN SELECT RAISE(ABORT, 'test deletion failure'); END;")
    vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      expect((await remove(request(), context(id))).status).toBe(500)
      expect(db.select().from(fileShares).where(eq(fileShares.id, id)).get()?.status).toBe('delete_failed')
    } finally { db.$client.exec('DROP TRIGGER fail_file_delete') }
    expect((await remove(request(), context(id))).status).toBe(200)
    expect(db.select().from(fileShares).where(eq(fileShares.id, id)).get()).toBeUndefined()
    expect((await remove(request(), context(id))).status).toBe(404)
  })

  it('清理回收失效文件，保留活跃文件，统计包含文本与文件', async () => {
    const expired = await seed('old.txt')
    await seed('active.txt')
    db.update(fileShares).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(fileShares.id, expired.id)).run()
    db.insert(pastes).values({ id: 'text', content: 'hello', createdAt: new Date() }).run()
    expect((await (await stats()).json()).data).toMatchObject({ total: 3, todayCount: 3, activeCount: 2 })
    expect((await (await cleanup()).json()).data).toMatchObject({ removed: 1, failed: 0 })
    expect((await (await list(request())).json()).data.total).toBe(1)
  })

  it('删除文本不会删除同编号文件的密码尝试', async () => {
    db.insert(pastes).values({ id: 'shared', content: 'hello', createdAt: new Date() }).run()
    db.insert(passwordAttempts).values([
      { id: 'text:shared:ip', shareKind: 'text', shareId: 'shared', ip: 'ip' },
      { id: 'file:shared:ip', shareKind: 'file', shareId: 'shared', ip: 'ip' },
    ]).run()
    expect((await removeText(request(), context('shared'))).status).toBe(200)
    expect(db.select().from(passwordAttempts).all().map((row) => row.shareKind)).toEqual(['file'])
  })
})
