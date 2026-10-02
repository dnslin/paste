// @vitest-environment node
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from './database';
import { pastes, passwordAttempts, type NewPaste } from '@/lib/db/schema';
import { encrypt } from '@/lib/crypto';
import { getPublicOrigin } from '@/lib/request-client';
import { verifySession, createSession } from '@/lib/admin/session';
import { POST as create } from '../pastes/route';
import { POST as read } from '../pastes/[id]/verify/route';
import { GET as metadata } from '../pastes/[id]/route';
import { POST as login } from '../admin/login/route';
import { GET as list } from '../admin/pastes/route';
import { GET as detail, DELETE as remove } from '../admin/pastes/[id]/route';
import { GET as stats } from '../admin/stats/route';
import PastePage from '../../../app/[id]/page';

vi.mock('@/lib/db', async () => await import('./database'));
vi.mock('@/lib/admin/session', () => ({ verifySession: vi.fn(), createSession: vi.fn() }));

let sequence = 0;
let ip: string;
const context = (id: string) => ({ params: Promise.resolve({ id }) });
function request(path: string, body?: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(`http://localhost:3000${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json', 'x-real-ip': ip, ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
function seed(overrides: Partial<NewPaste> = {}, password?: string) {
  const { encrypted, iv } = encrypt('private content <&>');
  const id = `paste-${++sequence}`;
  db.insert(pastes).values({ id, content: encrypted, iv, encrypted: true,
    language: 'javascript', createdAt: new Date(),
    passwordHash: password ? bcrypt.hashSync(password, 4) : null, ...overrides }).run();
  return overrides.id ?? id;
}

beforeEach(() => {
  sequence++;
  ip = `test-client-${sequence}`;
  vi.stubEnv('ENCRYPTION_KEY', 'a'.repeat(64));
  vi.stubEnv('TRUST_PROXY', 'true');
  vi.stubEnv('NEXT_PUBLIC_BASE_URL', '');
  vi.mocked(verifySession).mockResolvedValue(true);
  db.delete(passwordAttempts).run();
  db.delete(pastes).run();
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.useRealTimers(); });

describe('content claims', () => {
  it('never sends limited plaintext in page GET or metadata and only serves one claim', async () => {
    const id = seed({ burnCount: 1 });
    const page = JSON.stringify(await PastePage(context(id)));
    expect(page).not.toContain('private content');
    expect((await (await metadata(request(`/api/pastes/${id}`), context(id))).json()).data).not.toHaveProperty('content');
    const first = await read(request(`/api/pastes/${id}/verify`, { password: 'irrelevant' }), context(id));
    expect(first.status).toBe(200);
    expect((await first.json()).data).toMatchObject({ content: 'private content <&>', remainingViews: 0 });
    expect(first.headers.get('cache-control')).toBe('no-store');
    expect((await read(request(`/api/pastes/${id}/verify`, {}), context(id))).status).toBe(404);
  });

  it.each([undefined, 'correct password'])('allows exactly one of eight simultaneous requests, password=%s', async (password) => {
    const id = seed({ burnCount: 1 }, password);
    const responses = await Promise.all(Array.from({ length: 8 }, () => read(
      request(`/api/pastes/${id}/verify`, password ? { password } : {}), context(id))));
    expect(responses.filter((r) => r.status === 200)).toHaveLength(1);
    expect(responses.filter((r) => r.status === 404)).toHaveLength(7);
    expect(db.select().from(pastes).where(eq(pastes.id, id)).get()?.burnCount).toBe(0);
  });

  it('does not consume a view on a wrong password or a decryption failure', async () => {
    const id = seed({ burnCount: 2 }, 'correct');
    expect((await read(request('/verify', { password: 'wrong' }), context(id))).status).toBe(400);
    db.update(pastes).set({ content: 'broken' }).where(eq(pastes.id, id)).run();
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect((await read(request('/verify', { password: 'correct' }), context(id))).status).toBe(500);
    expect(db.select().from(pastes).where(eq(pastes.id, id)).get()?.burnCount).toBe(2);
    expect(log).toHaveBeenCalled();
    expect((await detail(request('/detail'), context(id))).status).toBe(500);
    expect(JSON.stringify(await PastePage(context(id)))).toContain('"initialStatus":"active"');
  });

  it('reports a service failure for a broken ordinary page instead of not_found', async () => {
    const id = seed({ content: 'invalid ciphertext' });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(JSON.stringify(await PastePage(context(id)))).toContain('"initialStatus":"error"');
  });

  it('rolls back a consumed view if a later operation in the claim fails', async () => {
    const id = seed({ burnCount: 1 }, 'correct');
    db.insert(passwordAttempts).values({ id: `${id}:${ip}`, pasteId: id, ip }).run();
    db.$client.exec("CREATE TRIGGER fail_attempt_cleanup BEFORE DELETE ON password_attempts BEGIN SELECT RAISE(ABORT, 'cleanup failed'); END;");
    vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect((await read(request('/verify', { password: 'correct' }), context(id))).status).toBe(500);
      expect(db.select().from(pastes).where(eq(pastes.id, id)).get()?.burnCount).toBe(1);
    } finally { db.$client.exec('DROP TRIGGER fail_attempt_cleanup'); }
  });

  it('does not let a pending correct comparison undo a lock from concurrent failures', async () => {
    const id = seed({ burnCount: 1 }, 'correct');
    let release: (value: boolean) => void = () => {};
    const comparison = new Promise<boolean>((resolve) => { release = resolve; });
    const compare = vi.spyOn(bcrypt, 'compare').mockImplementationOnce(() => comparison);
    const pending = read(request('/verify', { password: 'correct' }), context(id));
    await vi.waitFor(() => expect(compare).toHaveBeenCalledOnce());
    for (let i = 0; i < 5; i++) expect((await read(request('/verify', { password: 'wrong' }), context(id))).status).toBe(400);
    release(true);
    expect((await pending).status).toBe(429);
    expect(db.select().from(pastes).where(eq(pastes.id, id)).get()?.burnCount).toBe(1);
    expect(db.select().from(passwordAttempts).get()?.lockedUntil).not.toBeNull();
  });

  it('rejects pastes at the expiration boundary, including page and metadata', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-02T00:00:00Z'));
    const id = seed({ expiresAt: new Date() });
    expect((await read(request('/verify', {}), context(id))).status).toBe(404);
    expect(JSON.stringify(await PastePage(context(id)))).toContain('"initialStatus":"expired"');
  });

  it('locks after five failures and starts a fresh attempt count when the lock expires', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const id = seed({}, 'correct');
    for (let i = 0; i < 5; i++) expect((await read(request('/verify', { password: 'wrong' }), context(id))).status).toBe(400);
    expect((await read(request('/verify', { password: 'correct' }), context(id))).status).toBe(429);
    vi.setSystemTime(new Date(Date.now() + 15 * 60000 + 1000));
    expect((await read(request('/verify', { password: 'wrong' }), context(id))).status).toBe(400);
    expect(db.select().from(passwordAttempts).get()?.attempts).toBe(1);
    expect((await read(request('/verify', { password: 'correct' }), context(id))).status).toBe(200);
    expect(db.select().from(passwordAttempts).all()).toHaveLength(0);
  });
});

describe('creation and client identity', () => {
  it('returns a working HTTP URL and uses bcrypt for a password that can be unlocked', async () => {
    const password = '汉'.repeat(24);
    const response = await create(request('/api/pastes', { content: 'example', password, language: 'js', burnAfterRead: 1 }));
    expect(response.status).toBe(201);
    const { data } = await response.json();
    expect(data.url).toBe(`http://localhost:3000/${data.id}`);
    const stored = db.select().from(pastes).get();
    expect(stored?.passwordHash).toMatch(/^\$2[ab]\$/);
    expect(stored?.language).toBe('javascript');
    expect(await bcrypt.compare(password, stored!.passwordHash!)).toBe(true);
    expect((await read(request('/verify', { password }), context(data.id))).status).toBe(200);
  });
  it.each(['a'.repeat(73), '汉'.repeat(25), '   '])('uses the same password rules for creation and reading (%s)', async (password) => {
    expect((await create(request('/api/pastes', { content: 'example', password }))).status).toBe(400);
    const id = seed({}, 'valid');
    expect((await read(request('/verify', { password }), context(id))).status).toBe(400);
  });
  it.each([{ content: ' ' }, { content: 'a'.repeat(500001) }, { content: 'code', language: 'modelica' }, []])('rejects invalid creation input', async (body) => {
    expect((await create(request('/api/pastes', body))).status).toBe(400);
    expect(db.select().from(pastes).all()).toHaveLength(0);
  });
  it('cannot acquire new creation quotas with forged forwarding headers in direct mode', async () => {
    vi.stubEnv('TRUST_PROXY', 'false');
    for (let i = 0; i < 10; i++) {
      expect((await create(request('/api/pastes', {}, { 'x-real-ip': `fake-${i}`, 'x-forwarded-for': `fake-${i}` }))).status).toBe(400);
    }
    expect((await create(request('/api/pastes', {}, { 'x-real-ip': 'new-ip', 'x-forwarded-for': 'new-ip' }))).status).toBe(429);
  });
  it('cannot bypass a password lock by changing direct forwarding headers', async () => {
    vi.stubEnv('TRUST_PROXY', 'false');
    const id = seed({}, 'correct');
    for (let i = 0; i < 5; i++) {
      expect((await read(request('/verify', { password: 'wrong' }, { 'x-real-ip': `fake-${i}`, 'x-forwarded-for': `fake-${i}` }), context(id))).status).toBe(400);
    }
    expect((await read(request('/verify', { password: 'correct' }, { 'x-real-ip': 'new', 'x-forwarded-for': 'new' }), context(id))).status).toBe(429);
  });
  it('preserves the actual request host even when Next uses an internal localhost URL', async () => {
    vi.stubEnv('TRUST_PROXY', 'false');
    expect(getPublicOrigin(request('/api/pastes', { content: 'hello' }, { host: '127.0.0.1:3101' }))).toBe('http://127.0.0.1:3101');
  });
  it('respects an ingress-overwritten public scheme and host', async () => {
    const response = await create(request('/api/pastes', { content: 'hello' }, {
      'x-forwarded-proto': 'https', 'x-forwarded-host': 'paste.example.com',
    }));
    expect((await response.json()).data.url).toMatch(/^https:\/\/paste.example.com\//);
  });
  it('uses explicit public origin and logs failures instead of rejecting the request promise', async () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', 'https://paste.example.com');
    expect((await (await create(request('/api/pastes', { content: 'hello' }))).json()).data.url).toMatch(/^https:\/\/paste.example.com\//);
    vi.stubEnv('ENCRYPTION_KEY', 'invalid');
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect((await create(request('/api/pastes', { content: 'hello' }))).status).toBe(500);
    expect(log).toHaveBeenCalled();
  });
});

describe('admin routes', () => {
  it('limits public login before further bcrypt work and ignores forged direct IPs', async () => {
    vi.stubEnv('TRUST_PROXY', 'false');
    vi.stubEnv('ADMIN_PASSWORD_HASH', bcrypt.hashSync('admin', 4));
    for (let i = 0; i < 5; i++) expect((await login(request('/login', { password: 'wrong' }, { 'x-real-ip': `fake-${i}` }))).status).toBe(401);
    expect((await login(request('/login', { password: 'admin' }, { 'x-real-ip': 'different' }))).status).toBe(429);
    expect(createSession).not.toHaveBeenCalled();
  });
  it('validates null login bodies and creates a session only on valid credentials', async () => {
    vi.stubEnv('ADMIN_PASSWORD_HASH', bcrypt.hashSync('admin', 4));
    expect((await login(request('/login', null))).status).toBe(400);
    expect((await login(request('/login', { password: 'admin' }))).status).toBe(200);
    expect(createSession).toHaveBeenCalledOnce();
  });
  it('returns real pagination counts and clamps an empty last page after deletion', async () => {
    const first = seed();
    const second = seed();
    const result = await (await list(request('/api/admin/pastes?page=2&limit=1'))).json();
    expect(result.data).toMatchObject({ total: 2, page: 2, totalPages: 2, pageSize: 1 });
    expect(result.data.items).toHaveLength(1);
    await remove(request('/remove'), context(second));
    const after = await (await list(request('/api/admin/pastes?page=2&limit=1'))).json();
    expect(after.data).toMatchObject({ total: 1, page: 1, totalPages: 1, pageSize: 1 });
    expect(after.data.items[0].id).toBe(first);
  });
  it.each(['page=wat', 'page=0', 'limit=NaN', 'limit=101'])('rejects malformed pagination (%s)', async (query) => {
    expect((await list(request(`/api/admin/pastes?${query}`))).status).toBe(400);
  });
  it('cleans password attempts with a deletion and requires authentication for every admin read', async () => {
    const id = seed();
    db.insert(passwordAttempts).values({ id: 'attempt', pasteId: id, ip }).run();
    expect((await remove(request('/remove'), context(id))).status).toBe(200);
    expect(db.select().from(passwordAttempts).all()).toHaveLength(0);
    vi.mocked(verifySession).mockResolvedValue(false);
    expect((await list(request('/list'))).status).toBe(401);
    expect((await detail(request('/detail'), context(id))).status).toBe(401);
    expect((await remove(request('/remove'), context(id))).status).toBe(401);
    expect((await stats()).status).toBe(401);
  });
  it('counts today and its trend using the same UTC midnight, including exact midnight', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-02T01:00:00Z'));
    seed({ createdAt: new Date('2026-10-02T00:00:00Z') });
    seed({ createdAt: new Date('2026-10-02T00:30:00Z'), burnCount: 0 });
    seed({ createdAt: new Date('2026-10-01T23:59:59Z') });
    const { data } = await (await stats()).json();
    expect(data).toMatchObject({ total: 3, todayCount: 2, activeCount: 2 });
    expect(data.dailyTrend).toHaveLength(7);
    expect(data.dailyTrend.at(-1)).toEqual({ date: '2026-10-02', count: 2 });
    expect(data.dailyTrend.at(-2)).toEqual({ date: '2026-10-01', count: 1 });
  });
});
