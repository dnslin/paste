// Run after pnpm build. Uses a copied standalone app and a disposable volume only.
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import bcrypt from 'bcryptjs';
import { migrateDatabase } from './migrate.mjs';

const root = await mkdtemp(join(tmpdir(), 'paste-smoke-'));
const app = join(root, 'app');
let server;
let output = '';
let peakRssKiB = 0;
const sampleMemory = setInterval(async () => {
  if (!server || server.exitCode !== null) return;
  try {
    const status = await readFile(`/proc/${server.pid}/status`, 'utf8');
    peakRssKiB = Math.max(peakRssKiB, Number(status.match(/^VmRSS:\s+(\d+)/m)?.[1] ?? 0));
  } catch { /* Process may have exited between samples. */ }
}, 25);
sampleMemory.unref();
const passed = [];
try {
  await cp(resolve('.next/standalone'), app, { recursive: true });
  await cp(resolve('.next/static'), join(app, '.next/static'), { recursive: true });
  await cp(resolve('public'), join(app, 'public'), { recursive: true });
  // Never carry build-time SQLite files into the disposable verification volume.
  await rm(join(app, 'data'), { recursive: true, force: true });
  migrateDatabase(join(app, 'data/paste.db'), resolve('drizzle'));
  const listener = createServer();
  await new Promise(resolve => listener.listen(0, '127.0.0.1', resolve));
  const port = listener.address().port;
  await new Promise(resolve => listener.close(resolve));
  const origin = `http://127.0.0.1:${port}`;
  const environment = { ...process.env, NODE_ENV: 'production', HOSTNAME: '127.0.0.1', PORT: String(port),
    ENCRYPTION_KEY: randomBytes(32).toString('hex'), SESSION_SECRET: randomBytes(32).toString('hex'),
    ADMIN_PASSWORD_HASH: await bcrypt.hash('disposable-smoke-admin', 4), TRUST_PROXY: 'false', NEXT_PUBLIC_BASE_URL: '' };
  const start = async () => {
    output = '';
    server = spawn(process.execPath, [join(app, 'server.js')], { cwd: app, env: environment, stdio: ['ignore', 'pipe', 'pipe'] });
    server.stdout.on('data', chunk => { output += chunk; });
    server.stderr.on('data', chunk => { output += chunk; });
    for (let attempt = 0; attempt < 100; attempt++) {
      if (server.exitCode !== null) throw new Error(`Server exited: ${output}`);
      try { if ((await fetch(origin)).ok) return; } catch {}
      await delay(100);
    }
    throw new Error(`Server did not become ready: ${output}`);
  };
  const stop = async () => {
    if (server && server.exitCode === null) {
      const stopped = new Promise(resolve => server.once('exit', resolve));
      server.kill('SIGTERM'); await stopped;
    }
  };
  await start();
  const post = (path, body, cookie) => fetch(origin + path, { method: 'POST', headers: {
    'Content-Type': 'application/json', Origin: origin, ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify(body) });
  const login = await post('/api/admin/login', { password: 'disposable-smoke-admin' }); assert.equal(login.status, 200);
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const payload = Buffer.from([0, 1, 255, 128, 60, 115, 99, 114, 105, 112, 116, 62]);
  const form = (bytes = payload, count = '1') => {
    const data = new FormData(); data.set('file', new File([bytes], '验收.html', { type: 'text/html' }));
    data.set('password', 'disposable-file-password'); data.set('burnAfterRead', count); return data;
  };
  const upload = (data, headers = {}) => fetch(origin + '/api/files', { method: 'POST', headers: { Origin: origin, Cookie: cookie, ...headers }, body: data });
  assert.equal((await upload(form(), { Cookie: '' })).status, 401);
  assert.equal((await upload(form(), { Origin: 'https://foreign.invalid' })).status, 403);
  passed.push('unauthenticated and cross-site upload denied');
  const created = await upload(form()); assert.equal(created.status, 201); const { data } = await created.json();
  const metadata = await fetch(origin + `/api/pastes/${data.id}`); assert.match(metadata.headers.get('cache-control'), /no-store/);
  assert.equal(JSON.stringify(await metadata.json()).includes('验收.html'), false);
  const html = await (await fetch(origin + `/${data.id}`)).text(); assert.equal(html.includes('验收.html'), false);
  assert.match(html, /no-referrer/);
  assert.equal((await post(`/api/files/${data.id}/verify`, { password: 'wrong' })).status, 400);
  const verified = await post(`/api/files/${data.id}/verify`, { password: 'disposable-file-password' });
  assert.equal(verified.status, 200); assert.equal((await verified.json()).data.burnCount, 1);
  passed.push('protected HTML/API metadata and non-consuming password verification');
  const key = randomBytes(32).toString('base64url');
  const claims = await Promise.all([0, 1].map(() => post(`/api/files/${data.id}/claim`, { password: 'disposable-file-password', claimKey: key })));
  for (const claim of claims) { assert.equal(claim.status, 200); assert.equal((await claim.json()).data.remainingDownloads, 0); }
  const downloadPath = `/api/files/${data.id}/download`;
  assert.equal((await fetch(origin + downloadPath, { method: 'HEAD' })).status, 405);
  const download = await fetch(origin + downloadPath, { headers: { Authorization: `Bearer ${key}`, Range: 'bytes=2-3' } });
  assert.equal(download.status, 200); assert.equal(download.headers.get('accept-ranges'), 'none');
  assert.equal(download.headers.get('content-type'), 'application/octet-stream'); assert.match(download.headers.get('content-disposition'), /^attachment;/);
  assert.equal(download.headers.get('x-content-type-options'), 'nosniff'); assert.equal(download.headers.get('content-length'), String(payload.length));
  assert.deepEqual(Buffer.from(await download.arrayBuffer()), payload);
  passed.push('same-key concurrent claim charged once; HEAD denied; Range ignored; binary attachment intact');
  const boundary = await upload(form(Buffer.alloc(10 * 1024 * 1024, 137)));
  assert.equal(boundary.status, 201); const boundaryId = (await boundary.json()).data.id;
  assert.equal((await upload(form(Buffer.alloc(10 * 1024 * 1024 + 1)))).status, 413);
  passed.push('exact 10 MiB accepted; 10 MiB + 1 rejected via real HTTP');
  const directory = join(app, 'data/files'); assert.equal((await stat(directory)).mode & 0o777, 0o700);
  await stop();
  await writeFile(join(directory, 'f'.repeat(32)), 'unpublished orphan', { mode: 0o600 });
  await writeFile(join(directory, 'tmp', 'e'.repeat(32) + '.part'), 'partial upload', { mode: 0o600 });
  await start();
  await assert.rejects(stat(join(directory, 'f'.repeat(32))), { code: 'ENOENT' });
  await assert.rejects(stat(join(directory, 'tmp', 'e'.repeat(32) + '.part')), { code: 'ENOENT' });
  assert.equal((await post(`/api/files/${data.id}/claim`, { claimKey: key })).status, 200);
  const retry = await fetch(origin + downloadPath, { headers: { Authorization: `Bearer ${key}` } });
  assert.equal(retry.status, 200); assert.deepEqual(Buffer.from(await retry.arrayBuffer()), payload);
  passed.push('process restart preserves database/key/file/grant; startup orphan recovery completes before serving');
  for (const id of [data.id, boundaryId]) {
    const removed = await fetch(origin + `/api/admin/pastes/${id}`, { method: 'DELETE', headers: { Cookie: cookie, Origin: origin } });
    assert.equal(removed.status, 200);
  }
  assert.equal((await fetch(origin + downloadPath, { headers: { Authorization: `Bearer ${key}` } })).status, 403);
  // Text routes retain their original contract after file cleanup.
  const text = await post('/api/pastes', { content: 'legacy regression', burnAfterRead: 1 }); assert.equal(text.status, 201);
  const textId = (await text.json()).data.id;
  const textClaim = await post(`/api/pastes/${textId}/verify`, {}); assert.equal((await textClaim.json()).data.content, 'legacy regression');
  passed.push('revocation invalidates grant; legacy text create/claim still works');
  await stop();
  console.log(JSON.stringify({ passed, count: passed.length, serverPeakRssMiB: Math.round(peakRssKiB / 1024), fixtureVolume: 'removed after test' }, null, 2));
} catch (error) {
  console.error('Standalone smoke failed:', error, output);
  process.exitCode = 1;
} finally {
  clearInterval(sampleMemory);
  if (server && server.exitCode === null) { const stopped = new Promise(resolve => server.once('exit', resolve)); server.kill('SIGTERM'); await stopped; }
  await rm(root, { recursive: true, force: true });
}
