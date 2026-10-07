// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { mkdtemp, rm, readdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from './database';
import { downloadGrants, files, pastes, passwordAttempts } from '@/lib/db/schema';
import { verifySession } from '@/lib/admin/session';
import { POST as upload } from '../files/route';
import { POST as verify } from '../files/[id]/verify/route';
import { POST as claim } from '../files/[id]/claim/route';
import { GET as download, HEAD } from '../files/[id]/download/route';
import { GET as metadata } from '../pastes/[id]/route';
import { POST as readText } from '../pastes/[id]/verify/route';
import { GET as detail, DELETE as remove } from '../admin/pastes/[id]/route';
import PastePage from '../../../app/[id]/page';

vi.mock('@/lib/db', async () => await import('./database'));
vi.mock('@/lib/admin/session', () => ({ verifySession: vi.fn() }));
let root: string, ip: string, sequence = 0;
const context = (id: string) => ({ params: Promise.resolve({ id }) });
const token = () => randomBytes(32).toString('base64url');
const headers = () => ({ origin: 'http://localhost:3000', 'x-real-ip': ip });
function json(body: unknown) { return new NextRequest('http://localhost:3000/api/files/x', {
  method: 'POST', headers: { ...headers(), 'content-type': 'application/json' }, body: JSON.stringify(body),
}); }
function form(password = '') {
  const body = new FormData(); body.set('file', new File([Buffer.from([0,1,255,128,42])], 'secret.html', { type: 'text/html' }));
  body.set('password', password); body.set('burnAfterRead', '1');
  return new NextRequest('http://localhost:3000/api/files', { method: 'POST', headers: headers(), body });
}
async function create(password = '') {
  const response = await upload(form(password)); expect(response.status).toBe(201);
  return (await response.json()).data.id as string;
}
function get(key?: string) { return new NextRequest('http://localhost:3000/download', { headers: { ...headers(), ...(key ? { authorization: `Bearer ${key}` } : {}), range: 'bytes=1-2' } }); }
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'paste-file-routes-')); ip = `file-route-${++sequence}`;
  vi.spyOn(process, 'cwd').mockReturnValue(root); vi.stubEnv('ENCRYPTION_KEY', 'ab'.repeat(32)); vi.stubEnv('TRUST_PROXY', 'true');
  vi.stubEnv('NEXT_PUBLIC_BASE_URL', ''); vi.mocked(verifySession).mockResolvedValue(true);
  db.delete(downloadGrants).run(); db.delete(files).run(); db.delete(passwordAttempts).run(); db.delete(pastes).run();
});
afterEach(async () => { vi.restoreAllMocks(); vi.unstubAllEnvs(); await rm(root, { recursive: true, force: true }); });

it('authenticates before reading any upload bytes and rejects cross-site requests', async () => {
  vi.mocked(verifySession).mockResolvedValue(false); const request = form();
  expect((await upload(request)).status).toBe(401); expect(request.bodyUsed).toBe(false);
  vi.mocked(verifySession).mockResolvedValue(true); const forged = form(); forged.headers.set('origin', 'https://evil.example');
  expect((await upload(forged)).status).toBe(403); expect(forged.bodyUsed).toBe(false);
});
it('stores encrypted bytes and protects metadata in GET/HTML, with independent text rejection', async () => {
  const id = await create('correct');
  expect(JSON.stringify(await PastePage(context(id)))).not.toContain('secret.html');
  const publicMeta = await metadata(get(), context(id));
  expect(await publicMeta.json()).toMatchObject({ data: { kind: 'file', hasPassword: true } });
  expect(publicMeta.headers.get('cache-control')).toContain('no-store');
  expect((await verify(json({ password: 'wrong' }), context(id))).status).toBe(400);
  const verified = await verify(json({ password: 'correct' }), context(id));
  expect(await verified.json()).toMatchObject({ data: { fileName: 'secret.html', size: 5, burnCount: 1 } });
  const file = db.select().from(files).get()!;
  expect(await readFile(join(root, 'data/files', file.storageKey))).not.toEqual(Buffer.from([0,1,255,128,42]));
  expect(db.select().from(pastes).get()?.content).toBe('');
  expect((await readText(json({ password: 'correct' }), context(id))).status).toBe(400);
  expect(await (await detail(get(), context(id))).json()).toMatchObject({ data: { kind: 'file', fileName: 'secret.html' } });
});
it('delivers full authenticated binary attachments, rejects HEAD and retries without charging', async () => {
  const id = await create(), key = token();
  expect((await download(get(), context(id))).status).toBe(401);
  expect((await HEAD()).status).toBe(405);
  expect((await claim(json({ claimKey: key }), context(id))).status).toBe(200);
  for (let i = 0; i < 2; i++) {
    const response = await download(get(key), context(id)); expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/octet-stream');
    expect(response.headers.get('content-disposition')).toContain('attachment;');
    expect(response.headers.get('accept-ranges')).toBe('none');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('content-length')).toBe('5');
    expect(Buffer.from(await response.arrayBuffer())).toEqual(Buffer.from([0,1,255,128,42]));
  }
  expect(db.select().from(pastes).where(eq(pastes.id, id)).get()?.burnCount).toBe(0);
  expect((await claim(json({ claimKey: key }), context(id))).status).toBe(200);
});
it('revokes already-issued credentials and removes the encrypted object', async () => {
  const id = await create(), key = token(); await claim(json({ claimKey: key }), context(id));
  expect((await remove(new NextRequest('http://localhost:3000/delete', { method: 'DELETE', headers: headers() }), context(id))).status).toBe(200);
  expect((await download(get(key), context(id))).status).toBeGreaterThanOrEqual(400);
  expect((await readdir(join(root, 'data/files'))).filter(n => n !== 'tmp')).toHaveLength(0);
});
it('compensates storage if database publication fails', async () => {
  db.$client.exec("CREATE TRIGGER fail_file BEFORE INSERT ON files BEGIN SELECT RAISE(ABORT, 'injected'); END;");
  vi.spyOn(console, 'error').mockImplementation(() => {});
  try { expect((await upload(form())).status).toBe(500); }
  finally { db.$client.exec('DROP TRIGGER fail_file'); }
  expect(db.select().from(pastes).all()).toHaveLength(0);
  expect((await readdir(join(root, 'data/files'))).filter(n => n !== 'tmp')).toHaveLength(0);
});
it('sets no-store for validation and method failures as well as successes', async () => {
  const response = await claim(json({ claimKey: 'bad' }), context('missing'));
  expect(response.headers.get('cache-control')).toContain('no-store');
  expect((await HEAD()).headers.get('cache-control')).toContain('no-store');
});

it('rate limits metadata verification before reading more request bodies', async () => {
  for (let index = 0; index < 60; index++) {
    expect((await verify(json({}), context('missing'))).status).toBe(404);
  }
  const request = json({});
  const response = await verify(request, context('missing'));
  expect(response.status).toBe(429); expect(request.bodyUsed).toBe(false);
  expect(response.headers.get('retry-after')).toBe('5');
});
