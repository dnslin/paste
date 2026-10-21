// @vitest-environment node
import { mkdtemp, readFile, readdir, writeFile, truncate, rm, mkdir, unlink, statfs, stat, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from './database';
import { fileShares, passwordAttempts } from '@/lib/db/schema';
import { POST as upload } from '../files/route';
import { GET as metadata } from '../files/[id]/route';
import { POST as download } from '../files/[id]/download/route';
import { claimFileDownload, cleanupFileShares, createFileShare, deleteFileShare, getFileShareMetadata } from '@/lib/file-share';
import { getFileStorageUsage, reserveFileUpload, storeFile, readStoredFile, queueOrphanCleanup } from '@/lib/file-storage';
import { MAX_FILE_BYTES, MAX_UPLOAD_BYTES } from '@/lib/file-rules';

vi.mock('@/lib/db', async () => await import('./database'));
vi.mock('node:fs/promises', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:fs/promises')>();
  return { ...original, unlink: vi.fn(original.unlink), statfs: vi.fn(original.statfs), stat: vi.fn(original.stat), rename: vi.fn(original.rename) };
});
let folder: string;
let source = 0;
const context = (id: string) => ({ params: Promise.resolve({ id }) });
function client() { return `file-client-${++source}`; }
function request(body: unknown, ip = client(), headers: Record<string, string> = {}, signal?: AbortSignal) {
  return new NextRequest('http://localhost/api/files/id/download', { method: 'POST', body: JSON.stringify(body), signal,
    headers: { 'content-type': 'application/json', 'x-real-ip': ip, ...headers } });
}
function formRequest(form: FormData, ip = client()) {
  return new NextRequest('http://localhost/api/files', { method: 'POST', body: form, headers: { 'x-real-ip': ip } });
}
function form(bytes: Buffer | string = '文件内容', name = '交付 说明.md') {
  const data = new FormData();
  data.set('file', new File([typeof bytes === 'string' ? bytes : new Uint8Array(bytes)], name));
  return data;
}
async function seed(overrides: { password?: string; downloadLimit?: number | null; bytes?: Buffer; fileName?: string } = {}) {
  return createFileShare({ fileName: overrides.fileName ?? '交付 说明.md', bytes: overrides.bytes ?? Buffer.from('完整文件内容'), managementTokenHash: 'f'.repeat(64), ...overrides });
}
function row(id: string) { return db.select().from(fileShares).where(eq(fileShares.id, id)).get()!; }
async function consume(response: Response) { return Buffer.from(await response.arrayBuffer()); }

beforeEach(async () => {
  folder = await mkdtemp(join(tmpdir(), 'paste-files-'));
  vi.stubEnv('FILE_STORAGE_DIR', folder);
  vi.stubEnv('ENCRYPTION_KEY', 'a'.repeat(64));
  vi.stubEnv('TRUST_PROXY', 'true');
  vi.stubEnv('NEXT_PUBLIC_BASE_URL', 'https://paste.example');
  db.delete(passwordAttempts).run();
  db.delete(fileShares).run();
});
afterEach(async () => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.useRealTimers(); await rm(folder, { recursive: true, force: true }); });

describe('file creation and authenticated attachments', () => {
  it('creates encrypted bytes and downloads the original with safe Unicode attachment headers', async () => {
    const data = form(); data.set('downloadLimit', '3');
    const created = await upload(formRequest(data));
    expect(created.status).toBe(201);
    const result = (await created.json()).data;
    expect(result).toMatchObject({ url: `https://paste.example/f/${result.id}`, downloadLimit: 3 });
    const stored = row(result.id);
    const encrypted = await readFile(join(folder, stored.storageKey));
    expect(encrypted.includes(Buffer.from('文件内容'))).toBe(false);
    expect(encrypted.length).toBe(Buffer.byteLength('文件内容') + 28);
    const info = await metadata(new NextRequest('http://localhost/meta'), context(result.id));
    expect((await info.json()).data).toMatchObject({ fileName: '交付 说明.md', size: Buffer.byteLength('文件内容'), downloadsRemaining: 3 });
    expect(row(result.id).downloadsRemaining).toBe(3);
    const response = await download(request({}), context(result.id));
    expect(response.status).toBe(200);
    expect(response.headers.get('content-disposition')).toContain("filename*=UTF-8''%E4%BA%A4%E4%BB%98%20%E8%AF%B4%E6%98%8E.md");
    expect(response.headers.get('content-type')).toBe('application/octet-stream');
    expect(response.headers.get('content-length')).toBe(String(Buffer.byteLength('文件内容')));
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('x-downloads-remaining')).toBe('2');
    expect((await consume(response)).toString()).toBe('文件内容');
  });

  it('accepts a zero-byte selected text file and the exact 10 MiB boundary, rejects one extra byte', async () => {
    const zero = await upload(formRequest(form('', 'empty.txt')));
    expect(zero.status).toBe(201);
    const emptyResponse = await download(request({}), context((await zero.json()).data.id));
    expect((await consume(emptyResponse)).length).toBe(0);
    expect((await upload(formRequest(form(Buffer.alloc(MAX_FILE_BYTES, 65), 'full.txt')))).status).toBe(201);
    expect((await upload(formRequest(form(Buffer.alloc(MAX_FILE_BYTES + 1, 65), 'large.txt')))).status).toBe(413);
  });

  it('hides protected file identity, locks after five failures, and resets after 15 minutes', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const { id } = await seed({ password: '密码', downloadLimit: 1 });
    expect(getFileShareMetadata(id)).not.toHaveProperty('fileName');
    expect(getFileShareMetadata(id)).not.toHaveProperty('size');
    const ip = client();
    for (let i = 0; i < 5; i++) expect((await download(request({ password: '错误' }, ip), context(id))).status).toBe(400);
    expect((await download(request({ password: '密码' }, ip), context(id))).status).toBe(429);
    expect(row(id).downloadsRemaining).toBe(1);
    vi.setSystemTime(Date.now() + 15 * 60000 + 1000);
    const response = await download(request({ password: '密码' }, ip), context(id));
    expect(response.status).toBe(200);
    expect(decodeURIComponent(response.headers.get('x-file-name')!)).toBe('交付 说明.md');
    await consume(response);
    expect(row(id).downloadsRemaining).toBe(0);
    expect(db.select().from(passwordAttempts).all()).toHaveLength(0);
  });

  it('does not leak any plaintext or consume a chance when ciphertext or tag is corrupt', async () => {
    const { id } = await seed({ downloadLimit: 1 });
    const path = join(folder, row(id).storageKey);
    const cipher = await readFile(path); cipher[12] ^= 1; await writeFile(path, cipher);
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const response = await download(request({}), context(id));
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain('完整文件内容');
    expect(row(id).downloadsRemaining).toBe(1);
    expect(log).toHaveBeenCalled();
  });

  it('atomically awards the final chance to only one concurrent claimant', async () => {
    const { id } = await seed({ password: 'correct', downloadLimit: 1 });
    const claims = await Promise.allSettled(Array.from({ length: 8 }, () => claimFileDownload(id, 'correct', client())));
    expect(claims.filter((claim) => claim.status === 'fulfilled')).toHaveLength(1);
    expect(row(id).downloadsRemaining).toBe(0);
    expect(getFileShareMetadata(id)?.status).toBe('exhausted');
  });

  it('rejects ranges, expired shares, and malformed or overlong passwords without counting', async () => {
    const { id } = await seed({ downloadLimit: 3 });
    expect((await download(request({}, client(), { range: 'bytes=0-10' }), context(id))).status).toBe(400);
    expect((await download(request({ password: '界'.repeat(25) }), context(id))).status).toBe(400);
    db.update(fileShares).set({ expiresAt: new Date() }).where(eq(fileShares.id, id)).run();
    const expired = await download(request({}), context(id));
    expect(expired.status).toBe(404);
    expect((await expired.json()).error.code).toBe('FILE_EXPIRED');
    expect(row(id).downloadsRemaining).toBe(3);
  });
});

describe('request, capacity and concurrent resources', () => {
  it('checks allowed content and rejects duplicate, extra, missing and mismatched fields', async () => {
    const duplicate = form(); duplicate.append('file', new File(['x'], 'second.txt'));
    expect((await upload(formRequest(duplicate))).status).toBe(400);
    const extra = form(); extra.set('extra', 'bad');
    expect((await upload(formRequest(extra))).status).toBe(400);
    expect((await upload(formRequest(new FormData()))).status).toBe(400);
    expect((await upload(formRequest(form('pretend image', 'image.png')))).status).toBe(400);
    expect((await upload(formRequest(form(Buffer.from([0, 255, 3]), 'binary.txt')))).status).toBe(400);
    expect((await upload(formRequest(form('script', 'run.exe')))).status).toBe(400);
    expect(await readdir(folder)).toHaveLength(0);
  });

  it('bounds the real streamed request even when content-length lies and cancels the source', async () => {
    let cancelled = false;
    let chunks = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) { if (chunks++ < 100) controller.enqueue(new Uint8Array(1024 * 1024)); else controller.close(); },
      cancel() { cancelled = true; },
    });
    const input = new Request('http://localhost/api/files', { method: 'POST', body: stream, duplex: 'half',
      headers: { 'content-type': 'multipart/form-data; boundary=x', 'content-length': '1', 'x-real-ip': client() } } as RequestInit & { duplex: 'half' });
    expect((await upload(new NextRequest(input))).status).toBe(413);
    expect(cancelled).toBe(true);
    expect((await getFileStorageUsage()).reservedBytes).toBe(0);
    const excessiveField = form(); excessiveField.set('password', 'x'.repeat(MAX_UPLOAD_BYTES));
    expect((await upload(formRequest(excessiveField))).status).toBe(413);
  });

  it('times out stalled uploads after one 120-second deadline and releases their slots', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    let reading = 0;
    let cancelled = 0;
    function stalled() {
      const stream = new ReadableStream<Uint8Array>({
        pull() { reading++; },
        cancel() { cancelled++; },
      });
      return new NextRequest(new Request('http://localhost/api/files', { method: 'POST', body: stream, duplex: 'half',
        headers: { 'content-type': 'multipart/form-data; boundary=x', 'x-real-ip': client() } } as RequestInit & { duplex: 'half' }));
    }
    const first = upload(stalled()); const second = upload(stalled());
    await vi.waitFor(() => expect(reading).toBeGreaterThanOrEqual(2));
    expect((await upload(formRequest(form()))).status).toBe(429);
    await vi.advanceTimersByTimeAsync(120000);
    const results = await Promise.all([first, second]);
    expect(results.map((response) => response.status)).toEqual([408, 408]);
    expect((await results[0].json()).error.code).toBe('REQUEST_TIMEOUT');
    expect(cancelled).toBe(2);
    expect((await getFileStorageUsage()).reservedBytes).toBe(0);
    expect((await upload(formRequest(form()))).status).toBe(201);
  });

  it('immediately interrupts a pending request read on abort and releases its upload reservation', async () => {
    const controller = new AbortController();
    let reading = false;
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({ pull() { reading = true; }, cancel() { cancelled = true; } });
    const input = new Request('http://localhost/api/files', { method: 'POST', body: stream, duplex: 'half', signal: controller.signal,
      headers: { 'content-type': 'multipart/form-data; boundary=x', 'x-real-ip': client() } } as RequestInit & { duplex: 'half' });
    const pending = upload(new NextRequest(input));
    await vi.waitFor(() => expect(reading).toBe(true));
    controller.abort();
    expect((await pending).status).toBe(400);
    expect(cancelled).toBe(true);
    expect((await getFileStorageUsage()).reservedBytes).toBe(0);
    const release = await reserveFileUpload(); release();
  });

  it('limits direct-client uploads together and permits no fake forwarded identity', async () => {
    vi.stubEnv('TRUST_PROXY', 'false');
    for (let i = 0; i < 3; i++) expect((await upload(formRequest(form(), `spoof-${i}`))).status).toBe(201);
    expect((await upload(formRequest(form(), 'spoof-4'))).status).toBe(429);
  });

  it('reserves upload space before body consumption, releases on failure, and includes disk occupants', async () => {
    const first = await reserveFileUpload(); const second = await reserveFileUpload();
    try { await expect(reserveFileUpload()).rejects.toMatchObject({ code: 'RATE_LIMITED' }); }
    finally { first(); second(); }
    expect((await getFileStorageUsage()).reservedBytes).toBe(0);
    const occupied = join(folder, 'occupied'); await writeFile(occupied, ''); await truncate(occupied, 1024 * 1024 * 1024);
    expect((await getFileStorageUsage()).usedBytes).toBe(1024 * 1024 * 1024);
    expect((await upload(formRequest(form()))).status).toBe(507);
    expect((await getFileStorageUsage()).reservedBytes).toBe(0);
  });

  it('counts an approved upload that completes while another capacity snapshot is pending', async () => {
    const quota = 1024 * 1024 * 1024;
    const occupied = join(folder, 'occupied');
    await writeFile(occupied, ''); await truncate(occupied, quota - 15 * 1024 * 1024);
    const releaseB = await reserveFileUpload();
    const originalFs = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
    const oldOccupied = await originalFs.stat(occupied);
    vi.mocked(stat).mockClear();
    vi.mocked(stat).mockResolvedValueOnce(oldOccupied);
    let resumeDisk: () => void = () => {};
    const pausedDisk = new Promise<void>((resolve) => { resumeDisk = resolve; });
    let diskPending = false;
    vi.mocked(statfs).mockImplementationOnce(async (path) => {
      diskPending = true;
      await pausedDisk;
      return originalFs.statfs(path);
    });
    const pendingA = reserveFileUpload();
    await vi.waitFor(() => { expect(diskPending).toBe(true); expect(stat).toHaveBeenCalled(); });
    // B writes and releases after A already captured the old on-disk size.
    const fileB = await storeFile(Buffer.alloc(MAX_FILE_BYTES, 65)); fileB.finish(); releaseB();
    const rejected = expect(pendingA).rejects.toMatchObject({ code: 'INSUFFICIENT_STORAGE' });
    resumeDisk();
    await rejected;
    expect((await getFileStorageUsage()).usedBytes).toBeLessThanOrEqual(quota);
    expect((await getFileStorageUsage()).reservedBytes).toBe(0);
  });

  it('holds four download slots until streams drain, cancel or abort, and releases failed preparation', async () => {
    const { id } = await seed();
    const controller = new AbortController();
    const responses = await Promise.all(Array.from({ length: 4 }, (_, i) => download(request({}, client(), {}, i === 0 ? controller.signal : undefined), context(id))));
    expect(responses.every((response) => response.status === 200)).toBe(true);
    expect((await download(request({}), context(id))).status).toBe(429);
    controller.abort();
    const afterAbort = await download(request({}), context(id)); expect(afterAbort.status).toBe(200); await consume(afterAbort);
    await responses[1].body!.cancel();
    const afterCancel = await download(request({}), context(id)); expect(afterCancel.status).toBe(200); await consume(afterCancel);
    await Promise.all(responses.slice(2).map(consume));
    for (let i = 0; i < 5; i++) expect((await download(request({}), context('missing'))).status).toBe(404);
    const afterFailure = await download(request({}), context(id)); expect(afterFailure.status).toBe(200); await consume(afterFailure);
  });
});

describe('recoverable creation and physical cleanup', () => {
  it('removes bytes if database insertion fails and leaves no usable half-share', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    db.$client.exec("CREATE TRIGGER fail_file_create BEFORE INSERT ON file_shares BEGIN SELECT RAISE(ABORT, 'insert failure'); END;");
    try {
      expect((await upload(formRequest(form()))).status).toBe(500);
      expect(await readdir(folder)).toHaveLength(0);
      expect(db.select().from(fileShares).all()).toHaveLength(0);
      expect((await getFileStorageUsage()).reservedBytes).toBe(0);
      expect(log).toHaveBeenCalled();
    } finally { db.$client.exec('DROP TRIGGER fail_file_create'); }
  });

  it('retries rollback deletion of an uncommitted file without needing a restart', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    db.$client.exec("CREATE TRIGGER fail_file_create BEFORE INSERT ON file_shares BEGIN SELECT RAISE(ABORT, 'insert failure'); END;");
    vi.mocked(unlink).mockRejectedValueOnce(Object.assign(new Error('permission denied'), { code: 'EACCES' }));
    try {
      expect((await upload(formRequest(form()))).status).toBe(500);
      expect(db.select().from(fileShares).all()).toHaveLength(0);
      expect(await readdir(folder)).toHaveLength(1);
    } finally { db.$client.exec('DROP TRIGGER fail_file_create'); }
    expect(await cleanupFileShares()).toMatchObject({ orphansRemoved: 1, orphansFailed: 0 });
    expect(await readdir(folder)).toHaveLength(0);
  });

  it('retries temporary file cleanup after a rename and rollback unlink failure', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(rename).mockRejectedValueOnce(Object.assign(new Error('rename failed'), { code: 'EIO' }));
    vi.mocked(unlink).mockRejectedValueOnce(Object.assign(new Error('permission denied'), { code: 'EACCES' }));
    expect((await upload(formRequest(form()))).status).toBe(500);
    expect(db.select().from(fileShares).all()).toHaveLength(0);
    expect((await readdir(folder))[0]).toMatch(/\.tmp$/);
    expect(await cleanupFileShares()).toMatchObject({ orphansRemoved: 1, orphansFailed: 0 });
    expect(await readdir(folder)).toHaveLength(0);
    expect((await getFileStorageUsage()).reservedBytes).toBe(0);
  });

  it('preserves failed cleanup status and retries after a metadata delete failure', async () => {
    const { id } = await seed({ password: 'correct' });
    await download(request({ password: 'bad' }), context(id));
    db.$client.exec("CREATE TRIGGER fail_file_delete BEFORE DELETE ON file_shares BEGIN SELECT RAISE(ABORT, 'delete failure'); END;");
    vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(await deleteFileShare(id)).toEqual({ found: true, deleted: false });
      expect(row(id).status).toBe('delete_failed');
      expect(getFileShareMetadata(id)?.status).toBe('deleted');
      expect(await readdir(folder)).toHaveLength(0);
      expect(db.select().from(passwordAttempts).all()).toHaveLength(1);
    } finally { db.$client.exec('DROP TRIGGER fail_file_delete'); }
    expect(await cleanupFileShares()).toMatchObject({ removed: 1, failed: 0 });
    expect(getFileShareMetadata(id)).toBeNull();
    expect(db.select().from(passwordAttempts).all()).toHaveLength(0);
    expect(await deleteFileShare(id)).toEqual({ found: false, deleted: false });
  });

  it('retries an actual filesystem delete failure and excludes stopped content immediately', async () => {
    const { id } = await seed(); const stored = row(id);
    await rm(join(folder, stored.storageKey)); await mkdir(join(folder, stored.storageKey));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await deleteFileShare(id)).toEqual({ found: true, deleted: false });
    expect(row(id).status).toBe('delete_failed');
    expect((await download(request({}), context(id))).status).toBe(404);
    await rm(join(folder, stored.storageKey), { recursive: true });
    expect(await cleanupFileShares()).toMatchObject({ removed: 1, failed: 0 });
  });

  it('cleans expired and exhausted bytes; scans crash leftovers only when requested', async () => {
    const expired = await seed(); const exhausted = await seed({ downloadLimit: 1 }); const active = await seed();
    db.update(fileShares).set({ expiresAt: new Date() }).where(eq(fileShares.id, expired.id)).run();
    await claimFileDownload(exhausted.id, undefined, client());
    const temporary = 'a'.repeat(48) + '.tmp'; const orphan = 'b'.repeat(48) + '.bin';
    await writeFile(join(folder, temporary), 'orphan'); await writeFile(join(folder, orphan), 'orphan');
    expect(await cleanupFileShares()).toMatchObject({ removed: 2, orphansRemoved: 0 });
    expect(await readdir(folder)).toHaveLength(3);
    expect(await cleanupFileShares({ scanOrphans: true })).toMatchObject({ removed: 0, orphansRemoved: 2 });
    expect((await readdir(folder))).toEqual([row(active.id).storageKey]);
    expect(await cleanupFileShares({ scanOrphans: true })).toMatchObject({ removed: 0, failed: 0, orphansRemoved: 0 });
  });

  it('retries a known orphan after startup unlink fails without rescanning active storage', async () => {
    const key = 'c'.repeat(48) + '.tmp';
    await writeFile(join(folder, key), 'crash leftover');
    vi.mocked(unlink).mockRejectedValueOnce(Object.assign(new Error('permission denied'), { code: 'EACCES' }));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await cleanupFileShares({ scanOrphans: true })).toMatchObject({ orphansRemoved: 0, orphansFailed: 1 });
    expect(await readdir(folder)).toContain(key);
    const freshOrphan = 'd'.repeat(48) + '.bin';
    await writeFile(join(folder, freshOrphan), 'not scanned during runtime');
    expect(await cleanupFileShares()).toMatchObject({ orphansRemoved: 1, orphansFailed: 0 });
    expect(await readdir(folder)).toEqual([freshOrphan]);
    expect(await cleanupFileShares()).toMatchObject({ orphansRemoved: 0, orphansFailed: 0 });
  });

  it('does not remove a completed file whose upload is still committing metadata', async () => {
    const stored = await storeFile(Buffer.from('upload in flight'));
    expect(await cleanupFileShares({ scanOrphans: true })).toMatchObject({ orphansRemoved: 0 });
    expect((await readStoredFile(stored.storageKey, Buffer.byteLength('upload in flight'))).toString()).toBe('upload in flight');
    queueOrphanCleanup(stored.storageKey);
    expect(await cleanupFileShares()).toMatchObject({ orphansRemoved: 0 });
    stored.finish();
    expect(await cleanupFileShares()).toMatchObject({ orphansRemoved: 1 });
  });
});
