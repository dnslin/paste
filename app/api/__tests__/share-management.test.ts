// @vitest-environment node
import { createHash } from 'node:crypto';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from './database';
import { pastes, fileShares, passwordAttempts } from '@/lib/db/schema';
import { POST as createText } from '../pastes/route';
import { POST as upload } from '../files/route';
import { GET as publicText } from '../pastes/[id]/route';
import { GET as publicFile } from '../files/[id]/route';
import { POST as readText } from '../pastes/[id]/verify/route';
import { POST as download } from '../files/[id]/download/route';
import { GET as manage, DELETE as revoke } from '../manage/[kind]/[id]/route';
import { claimFileDownload, cleanupFileShares } from '@/lib/file-share';
import * as storage from '@/lib/file-storage';

vi.mock('@/lib/db', async () => await import('./database'));
let directory: string;
let sequence = 0;
const context = (kind: string, id: string) => ({ params: Promise.resolve({ kind, id }) });
const publicContext = (id: string) => ({ params: Promise.resolve({ id }) });
function request(method: string, token?: string, body?: unknown) {
  return new NextRequest('https://paste.example/api/manage', { method,
    headers: { 'x-real-ip': `management-${++sequence}`, ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body ? { 'content-type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}) });
}
async function create(kind: 'text' | 'file', password?: string) {
  let response: Response;
  if (kind === 'text') response = await createText(request('POST', undefined, { content: 'private text content', language: 'javascript', burnAfterRead: 1, password }));
  else {
    const form = new FormData();
    form.set('file', new File(['private file content'], 'private-file.txt'));
    form.set('downloadLimit', '1');
    if (password) form.set('password', password);
    response = await upload(new NextRequest('https://paste.example/api/files', { method: 'POST', body: form, headers: { 'x-real-ip': `management-${++sequence}` } }));
  }
  expect(response.status).toBe(201);
  expect(response.headers.get('cache-control')).toBe('no-store');
  const data = (await response.json()).data;
  const url = new URL(data.managementUrl);
  return { ...data, token: url.hash.slice(1), managementUrl: url };
}

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'paste-management-'));
  vi.stubEnv('ENCRYPTION_KEY', 'a'.repeat(64));
  vi.stubEnv('TRUST_PROXY', 'true');
  vi.stubEnv('NEXT_PUBLIC_BASE_URL', 'https://paste.example');
  vi.stubEnv('FILE_STORAGE_DIR', directory);
  db.delete(passwordAttempts).run(); db.delete(pastes).run(); db.delete(fileShares).run();
});
afterEach(async () => { vi.restoreAllMocks(); vi.unstubAllEnvs(); await rm(directory, { recursive: true, force: true }); });

describe('private share management', () => {
  it.each(['text', 'file'] as const)('%s issues a separate random management capability and only persists its digest', async (kind) => {
    const created = await create(kind);
    const other = await create(kind);
    expect(created.managementUrl.pathname).toBe(`/manage/${kind}/${created.id}`);
    expect(Buffer.from(created.token, 'base64url')).toHaveLength(32);
    expect(created.token).not.toBe(other.token);
    const table = kind === 'text' ? pastes : fileShares;
    const stored = db.select().from(table).where(eq(table.id, created.id)).get()!;
    expect(stored.managementTokenHash).toBe(createHash('sha256').update(created.token).digest('hex'));
    expect(JSON.stringify(stored)).not.toContain(created.token);
    const info = kind === 'text' ? await publicText(request('GET'), publicContext(created.id)) : await publicFile(request('GET'), publicContext(created.id));
    const publicBody = await info.json();
    expect(JSON.stringify(publicBody)).not.toContain(created.token);
    expect(JSON.stringify(publicBody)).not.toContain(stored.managementTokenHash);
    expect(publicBody.data).not.toHaveProperty('managementUrl');
  });

  it.each(['text', 'file'] as const)('%s GET reveals only authorized metadata and never consumes its final chance', async (kind) => {
    const created = await create(kind, 'correct-password');
    for (let i = 0; i < 2; i++) {
      const response = await manage(request('GET', created.token), context(kind, created.id));
      expect(response.status).toBe(200);
      expect(response.headers.get('cache-control')).toBe('no-store');
      const body = (await response.json()).data;
      expect(body).toMatchObject({ kind, id: created.id, status: 'active', remaining: 1, hasPassword: true });
      expect(Object.keys(body).sort()).toEqual(['createdAt', 'expiresAt', 'hasPassword', 'id', 'kind', kind === 'text' ? 'language' : 'fileName', 'remaining', 'status'].sort());
    }
    const table = kind === 'text' ? pastes : fileShares;
    expect(db.select().from(table).where(eq(table.id, created.id)).get()).toBeDefined();
    expect(db.select().from(passwordAttempts).all()).toHaveLength(0);
  });

  it.each(['text', 'file'] as const)('%s rejects missing, wrong, cross-share, cross-kind, password and old-share capabilities', async (kind) => {
    const created = await create(kind, 'access-password');
    const other = await create(kind);
    const table = kind === 'text' ? pastes : fileShares;
    for (const method of ['GET', 'DELETE']) {
      const action = method === 'GET' ? manage : revoke;
      for (const token of [undefined, 'wrong', other.token, 'access-password']) {
        const response = await action(request(method, token), context(kind, created.id));
        expect(response.status).toBe(404);
        expect(await response.json()).toEqual({ success: false, error: { code: 'MANAGEMENT_UNAVAILABLE', message: '管理链接无效或分享已失效' } });
      }
      expect((await action(request(method, created.token), context(kind === 'text' ? 'file' : 'text', created.id))).status).toBe(404);
      expect((await action(request(method, created.token), context('unknown', created.id))).status).toBe(404);
    }
    db.update(table).set({ managementTokenHash: null }).where(eq(table.id, created.id)).run();
    expect((await manage(request('GET', created.token), context(kind, created.id))).status).toBe(404);
    expect((await revoke(request('DELETE', created.token), context(kind, created.id))).status).toBe(404);
    expect(db.select().from(table).where(eq(table.id, created.id)).get()).toBeDefined();
  });

  it.each(['text', 'file'] as const)('%s revoke removes access and repeated visits share the generic unavailable response', async (kind) => {
    const created = await create(kind, 'correct-password');
    db.insert(passwordAttempts).values({ id: `${kind}:${created.id}:bad-ip`, shareId: created.id, shareKind: kind, ip: 'bad-ip', attempts: 1 }).run();
    const response = await revoke(request('DELETE', created.token), context(kind, created.id));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, data: { revoked: true } });
    const claim = kind === 'text' ? await readText(request('POST', undefined, { password: 'correct-password' }), publicContext(created.id)) : await download(request('POST', undefined, { password: 'correct-password' }), publicContext(created.id));
    expect(claim.status).toBe(404);
    expect(db.select().from(passwordAttempts).all()).toHaveLength(0);
    expect((await manage(request('GET', created.token), context(kind, created.id))).status).toBe(404);
    expect((await revoke(request('DELETE', created.token), context(kind, created.id))).status).toBe(404);
    if (kind === 'file') expect(await readdir(directory)).toHaveLength(0);
  });

  it('revocation wins over a text claim still checking its password', async () => {
    const created = await create('text', 'correct-password');
    let release: (result: boolean) => void = () => {};
    const comparison = new Promise<boolean>((resolve) => { release = resolve; });
    const compare = vi.spyOn(bcrypt, 'compare').mockImplementationOnce(() => comparison);
    const pending = readText(request('POST', undefined, { password: 'correct-password' }), publicContext(created.id));
    await vi.waitFor(() => expect(compare).toHaveBeenCalledOnce());
    expect((await revoke(request('DELETE', created.token), context('text', created.id))).status).toBe(200);
    release(true);
    expect((await pending).status).toBe(404);
  });

  it('stops downloads even if physical deletion fails and retries with the existing cleanup', async () => {
    const created = await create('file');
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(storage, 'removeStoredFile').mockRejectedValueOnce(new Error('permission denied'));
    expect((await revoke(request('DELETE', created.token), context('file', created.id))).status).toBe(200);
    expect(db.select().from(fileShares).get()?.status).toBe('delete_failed');
    await expect(claimFileDownload(created.id, undefined, 'stopped')).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect((await manage(request('GET', created.token), context('file', created.id))).status).toBe(404);
    expect(log).toHaveBeenCalled();
    expect((await cleanupFileShares()).removed).toBe(1);
    expect(await readdir(directory)).toHaveLength(0);
  });

  it.each(['resolve', 'reject'] as const)('revocation wins over file IO that completes with %s after deletion', async (completion) => {
    const created = await create('file');
    let release: () => void = () => {};
    const barrier = new Promise<void>((resolve) => { release = resolve; });
    const read = vi.spyOn(storage, 'readStoredFile').mockImplementationOnce(async () => {
      await barrier;
      if (completion === 'reject') throw Object.assign(new Error('file removed during open'), { code: 'ENOENT' });
      return Buffer.from('private file content');
    });
    const pending = download(request('POST', undefined, {}), publicContext(created.id));
    await vi.waitFor(() => expect(read).toHaveBeenCalledOnce());
    expect((await revoke(request('DELETE', created.token), context('file', created.id))).status).toBe(200);
    release();
    const response = await pending;
    expect(response.status).toBe(404);
    expect(await response.text()).not.toContain('private file content');
  });

  it('keeps a genuine active-file IO error observable instead of masking it as a revoked share', async () => {
    const created = await create('file');
    const cause = new Error('active file read failed');
    vi.spyOn(storage, 'readStoredFile').mockRejectedValueOnce(cause);
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect((await download(request('POST', undefined, {}), publicContext(created.id))).status).toBe(500);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('Download file'), cause);
    expect(db.select().from(fileShares).get()?.downloadsRemaining).toBe(1);
  });

  it.each(['text', 'file'] as const)('%s reports remaining expiration and exhausted states without mutating the share', async (kind) => {
    const created = await create(kind);
    const table = kind === 'text' ? pastes : fileShares;
    db.update(table).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(table.id, created.id)).run();
    expect((await (await manage(request('GET', created.token), context(kind, created.id))).json()).data.status).toBe('expired');
    if (kind === 'text') db.update(pastes).set({ expiresAt: null, burnCount: 0 }).where(eq(pastes.id, created.id)).run();
    else db.update(fileShares).set({ expiresAt: new Date(Date.now() + 60000), downloadsRemaining: 0 }).where(eq(fileShares.id, created.id)).run();
    expect((await (await manage(request('GET', created.token), context(kind, created.id))).json()).data).toMatchObject({ status: 'exhausted', remaining: 0 });
    expect(db.select().from(table).where(eq(table.id, created.id)).get()).toBeDefined();
  });

  it('does not misreport a database deletion failure as revoked and leaves the share intact', async () => {
    const created = await create('text');
    db.insert(passwordAttempts).values({ id: 'cleanup-failure', shareId: created.id, shareKind: 'text', ip: 'ip' }).run();
    db.$client.exec("CREATE TRIGGER fail_management_cleanup BEFORE DELETE ON password_attempts BEGIN SELECT RAISE(ABORT, 'cleanup failed'); END;");
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect((await revoke(request('DELETE', created.token), context('text', created.id))).status).toBe(500);
      expect(db.select().from(pastes).get()?.id).toBe(created.id);
      expect(log).toHaveBeenCalled();
    } finally { db.$client.exec('DROP TRIGGER fail_management_cleanup'); }
  });
});
