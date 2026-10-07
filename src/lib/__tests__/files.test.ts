// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '../../../app/api/__tests__/database';
import { pastes, files, downloadGrants, passwordAttempts } from '@/lib/db/schema';
import { claimFile, verifyFile, authorizeDownload, revokeFile, cleanupFiles } from '@/lib/files';
import { readFilePayload, deleteStoredFile, scanOrphanFiles } from '@/lib/file-storage';

vi.mock('@/lib/db', async () => await import('../../../app/api/__tests__/database'));
vi.mock('@/lib/file-storage', () => ({
  acquirePayloadSlot: vi.fn(() => vi.fn()), readFilePayload: vi.fn(async () => Buffer.from('payload')),
  deleteStoredFile: vi.fn(async () => {}), scanOrphanFiles: vi.fn(async () => {}), ensureFileStorage: vi.fn(async () => {}),
}));
let seq = 0;
const key = () => randomBytes(32).toString('base64url');
function seed(count = 1, password?: string) {
  const id = `file-${++seq}`;
  db.insert(pastes).values({ id, kind: 'file', content: '', burnCount: count, expiresAt: new Date(Date.now() + 86400000),
    createdAt: new Date(), passwordHash: password ? bcrypt.hashSync(password, 4) : null }).run();
  db.insert(files).values({ pasteId: id, storageKey: randomBytes(24).toString('hex'), fileName: 'private.html', size: 7,
    encryptionVersion: 1, nonce: 'a'.repeat(24), tag: 'b'.repeat(32) }).run();
  return id;
}
const count = (id: string) => db.select().from(pastes).where(eq(pastes.id, id)).get()?.burnCount;
beforeEach(() => {
  db.delete(downloadGrants).run(); db.delete(files).run(); db.delete(passwordAttempts).run(); db.delete(pastes).run();
  vi.mocked(readFilePayload).mockResolvedValue(Buffer.from('payload'));
  vi.mocked(deleteStoredFile).mockResolvedValue();
});
afterEach(() => { vi.restoreAllMocks(); vi.clearAllMocks(); vi.useRealTimers(); });

describe('file authorization', () => {
  it('verifies protected metadata without spending a claim and rejects wrong passwords', async () => {
    const id = seed(1, 'correct');
    await expect(verifyFile(id, 'wrong', `ip-${seq}`)).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(count(id)).toBe(1);
    expect(await verifyFile(id, 'correct', `ip-${seq}`)).toMatchObject({ fileName: 'private.html', size: 7, burnCount: 1 });
    expect(count(id)).toBe(1);
  });
  it('grants only one of distinct competing keys when one remains', async () => {
    const id = seed();
    const results = await Promise.allSettled(Array.from({ length: 8 }, (_, i) => claimFile(id, key(), undefined, `ip-${seq}-${i}`)));
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect(count(id)).toBe(0); expect(db.select().from(downloadGrants).all()).toHaveLength(1);
  });
  it('deduplicates same-key concurrency and retries after losing the response', async () => {
    const id = seed(2); const token = key();
    const results = await Promise.all(Array.from({ length: 8 }, () => claimFile(id, token, undefined, `ip-${seq}`)));
    expect(new Set(results.map(r => r.expiresAt)).size).toBe(1);
    expect(count(id)).toBe(1); expect(db.select().from(downloadGrants).all()).toHaveLength(1);
    await claimFile(id, token, undefined, `ip-${seq}`); expect(count(id)).toBe(1);
    expect(db.select().from(downloadGrants).get()?.tokenHash).not.toBe(token);
  });
  it('allows passwordless retry of an existing grant and exhausted downloads', async () => {
    const id = seed(1, 'correct'); const token = key();
    await claimFile(id, token, 'correct', `ip-${seq}`);
    await expect(claimFile(id, token, undefined, `ip-${seq}`)).resolves.toMatchObject({ remainingDownloads: 0 });
    expect(authorizeDownload(id, token).file.fileName).toBe('private.html');
    expect(authorizeDownload(id, token).file.size).toBe(7);
    expect(count(id)).toBe(0);
  });
  it('never lets a key cross shares or re-claim after its expiration', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const id = seed(2), other = seed(2), token = key();
    await claimFile(id, token, undefined, `ip-${seq}`);
    await expect(claimFile(other, token, undefined, `other-${seq}`)).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    expect(() => authorizeDownload(other, token)).toThrow();
    vi.setSystemTime(Date.now() + 15 * 60000);
    await expect(claimFile(id, token, undefined, `ip-${seq}`)).rejects.toMatchObject({ code: 'GRANT_EXPIRED' });
    expect(count(id)).toBe(1); expect(() => authorizeDownload(id, token)).toThrow();
  });
  it.each(['', 'x'.repeat(43), 'A'.repeat(44), 'A'.repeat(42), 'A'.repeat(42) + '='])('rejects noncanonical bearer %s', async token => {
    const id = seed();
    await expect(claimFile(id, token, undefined, `ip-${seq}`)).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(count(id)).toBe(1);
  });
  it('bounds grants by share expiry and denies at the precise expiry boundary', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const id = seed(), token = key(), expiry = new Date(Math.floor((Date.now() + 5000) / 1000) * 1000);
    db.update(pastes).set({ expiresAt: expiry }).where(eq(pastes.id, id)).run();
    expect((await claimFile(id, token, undefined, `ip-${seq}`)).expiresAt).toBe(expiry.toISOString());
    vi.setSystemTime(expiry); expect(() => authorizeDownload(id, token)).toThrow();
  });
  it('does not spend a claim or issue a grant for unreadable/corrupted ciphertext', async () => {
    const id = seed(); vi.mocked(readFilePayload).mockRejectedValueOnce(new Error('authenticated decryption failed'));
    await expect(claimFile(id, key(), undefined, `ip-${seq}`)).rejects.toThrow();
    expect(count(id)).toBe(1); expect(db.select().from(downloadGrants).all()).toHaveLength(0);
  });
  it('rolls back the decrement when inserting a grant fails', async () => {
    const id = seed();
    db.$client.exec("CREATE TRIGGER fail_grant BEFORE INSERT ON download_grants BEGIN SELECT RAISE(ABORT, 'injected'); END;");
    try { await expect(claimFile(id, key(), undefined, `ip-${seq}`)).rejects.toThrow(); }
    finally { db.$client.exec('DROP TRIGGER fail_grant'); }
    expect(count(id)).toBe(1); expect(db.select().from(downloadGrants).all()).toHaveLength(0);
  });
  it('checks a concurrent password lock again after payload preflight', async () => {
    const id = seed(1, 'correct'); let release: (data: Buffer) => void = () => {};
    vi.mocked(readFilePayload).mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
    const pending = claimFile(id, key(), 'correct', `ip-${seq}`);
    await vi.waitFor(() => expect(readFilePayload).toHaveBeenCalled());
    db.insert(passwordAttempts).values({ id: `${id}:ip-${seq}`, pasteId: id, ip: `ip-${seq}`, attempts: 5,
      lockedUntil: new Date(Date.now() + 900000) }).run();
    release(Buffer.from('payload'));
    await expect(pending).rejects.toMatchObject({ code: 'RATE_LIMITED' }); expect(count(id)).toBe(1);
  });
  it('rejects text IDs instead of granting their contents as a file', async () => {
    db.insert(pastes).values({ id: 'text', content: 'hello', createdAt: new Date() }).run();
    await expect(verifyFile('text', undefined, 'ip')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('file lifecycle', () => {
  it('keeps exhausted shares until the last live grant expires then removes all related rows', async () => {
    vi.useFakeTimers({ toFake: ['Date'] }); const id = seed(), token = key();
    await claimFile(id, token, undefined, `ip-${seq}`); await cleanupFiles();
    expect(deleteStoredFile).not.toHaveBeenCalled(); expect(count(id)).toBe(0);
    db.insert(passwordAttempts).values({ id: `attempt-${id}`, pasteId: id, ip: 'x' }).run();
    vi.setSystemTime(Date.now() + 900000); await cleanupFiles();
    expect(count(id)).toBeUndefined(); expect(db.select().from(files).all()).toHaveLength(0);
    expect(db.select().from(downloadGrants).all()).toHaveLength(0);
    expect(db.select().from(passwordAttempts).all()).toHaveLength(0);
  });
  it('immediately revokes bearer authorization even if unlink fails, then retries cleanup', async () => {
    const id = seed(), token = key(); await claimFile(id, token, undefined, `ip-${seq}`);
    vi.mocked(deleteStoredFile).mockRejectedValueOnce(new Error('EACCES')); vi.spyOn(console, 'error').mockImplementation(() => {});
    await revokeFile(id); expect(() => authorizeDownload(id, token)).toThrow();
    expect(db.select().from(files).get()?.state).toBe('deleting');
    await cleanupFiles(); expect(count(id)).toBeUndefined();
  });
  it('cannot finish a pending claim after revocation', async () => {
    const id = seed(); let release: (data: Buffer) => void = () => {};
    vi.mocked(readFilePayload).mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
    const pending = claimFile(id, key(), undefined, `ip-${seq}`);
    await vi.waitFor(() => expect(readFilePayload).toHaveBeenCalled()); await revokeFile(id); release(Buffer.from('payload'));
    await expect(pending).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(db.select().from(downloadGrants).all()).toHaveLength(0);
  });
  it('does not delete old text records and passes referenced keys to orphan recovery', async () => {
    db.insert(pastes).values({ id: 'old-text', content: 'kept', createdAt: new Date(), expiresAt: new Date(0), burnCount: 0 }).run();
    seed(); await cleanupFiles(true);
    expect(count('old-text')).toBe(0); expect(scanOrphanFiles).toHaveBeenCalledWith(expect.any(Set), true);
  });
});
