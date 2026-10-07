// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, open, readFile, readdir, rm, stat, symlink, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  acquirePayloadSlot, deleteStoredFile, ensureFileStorage, getFileStorageDirectory,
  readFilePayload, reserveUpload, scanOrphanFiles, storeFile,
} from '../file-storage';
import { FILE_QUOTA_BYTES, MAX_FILE_BYTES, ORPHAN_GRACE_MS } from '../file-config';

let directory: string;
const releases: Array<() => void> = [];

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'paste-files-'));
  vi.spyOn(process, 'cwd').mockReturnValue(directory);
  vi.stubEnv('ENCRYPTION_KEY', 'ab'.repeat(32));
});

afterEach(async () => {
  releases.splice(0).forEach((release) => release());
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  await rm(directory, { recursive: true, force: true });
});

describe('private binary file storage', () => {
  it('authenticates arbitrary opaque bytes and creates private directories and ciphertext', async () => {
    const bytes = Buffer.from([0, 255, 128, 13, 10, 60, 62]);
    const stored = await storeFile('share123', bytes);
    releases.push(stored.releaseActive);
    expect(await readFilePayload('share123', stored)).toEqual(bytes);
    const root = getFileStorageDirectory();
    expect((await stat(root)).mode & 0o777).toBe(0o700);
    expect((await stat(join(root, 'tmp'))).mode & 0o777).toBe(0o700);
    expect((await stat(join(root, stored.storageKey))).mode & 0o777).toBe(0o600);
    expect(await readFile(join(root, stored.storageKey))).not.toEqual(bytes);
    expect(await readdir(join(root, 'tmp'))).toEqual([]);
  });

  it('supports an empty named file', async () => {
    const stored = await storeFile('empty123', Buffer.alloc(0));
    releases.push(stored.releaseActive);
    expect(await readFilePayload('empty123', stored)).toEqual(Buffer.alloc(0));
  });

  it('binds authenticated ciphertext to its exact share ID', async () => {
    const stored = await storeFile('share123', Buffer.from('private'));
    releases.push(stored.releaseActive);
    await expect(readFilePayload('other123', stored)).rejects.toThrow();
  });

  it.each(['ciphertext', 'nonce', 'tag'] as const)('does not return unauthenticated bytes after %s tampering', async (kind) => {
    const stored = await storeFile('share123', Buffer.from('private'));
    releases.push(stored.releaseActive);
    if (kind === 'ciphertext') {
      const path = join(getFileStorageDirectory(), stored.storageKey);
      const bytes = await readFile(path);
      bytes[0] ^= 255;
      await writeFile(path, bytes);
    } else {
      stored[kind] = (stored[kind].startsWith('ff') ? '00' : 'ff') + stored[kind].slice(2);
    }
    await expect(readFilePayload('share123', stored)).rejects.toThrow();
  });

  it.each(['', 'a'.repeat(63), 'g'.repeat(64), 'ab'.repeat(32) + '\n'])('rejects a malformed encryption key', async (key) => {
    vi.stubEnv('ENCRYPTION_KEY', key);
    await expect(storeFile('share123', Buffer.from('private'))).rejects.toThrow();
  });

  it('rejects oversize buffers, metadata, and mismatched on-disk lengths', async () => {
    await expect(storeFile('share123', Buffer.alloc(MAX_FILE_BYTES + 1))).rejects.toThrow();
    const stored = await storeFile('share123', Buffer.from('private'));
    releases.push(stored.releaseActive);
    await expect(readFilePayload('share123', { ...stored, size: MAX_FILE_BYTES + 1 })).rejects.toThrow();
    await writeFile(join(getFileStorageDirectory(), stored.storageKey), Buffer.alloc(stored.size + 1));
    await expect(readFilePayload('share123', stored)).rejects.toThrow();
  });

  it('rejects path traversal and symlinked storage roots', async () => {
    await expect(deleteStoredFile('../database.db')).rejects.toThrow();
    await mkdir(join(directory, 'data'));
    await mkdir(join(directory, 'public'));
    await symlink(join(directory, 'public'), join(directory, 'data', 'files'));
    await expect(ensureFileStorage()).rejects.toThrow();
  });

  it('allows only two process-wide payloads and makes releases idempotent', () => {
    const first = acquirePayloadSlot();
    const second = acquirePayloadSlot();
    releases.push(first, second);
    expect(acquirePayloadSlot).toThrow(/繁忙/);
    first();
    first();
    releases.push(acquirePayloadSlot());
    expect(acquirePayloadSlot).toThrow();
  });

  it('serializes quota reservations and includes final files and temporary bytes', async () => {
    await ensureFileStorage();
    const sparse = await open(join(getFileStorageDirectory(), 'quota-object'), 'wx');
    await sparse.truncate(FILE_QUOTA_BYTES - MAX_FILE_BYTES);
    await sparse.close();
    const result = await Promise.allSettled([reserveUpload(), reserveUpload()]);
    expect(result.filter((entry) => entry.status === 'fulfilled')).toHaveLength(1);
    result.forEach((entry) => { if (entry.status === 'fulfilled') releases.push(entry.value); });
    releases.splice(0).forEach((release) => release());
    await writeFile(join(getFileStorageDirectory(), 'tmp', 'orphan.part'), Buffer.from('x'));
    await expect(reserveUpload()).rejects.toThrow();
  });

  it('keeps active and referenced objects while collecting old orphans', async () => {
    const active = await storeFile('share123', Buffer.from('active'));
    releases.push(active.releaseActive);
    const published = await storeFile('share456', Buffer.from('published'));
    published.releaseActive();
    const root = getFileStorageDirectory();
    const stale = join(root, 'b'.repeat(32));
    const recent = join(root, 'c'.repeat(32));
    const temporary = join(root, 'tmp', 'd'.repeat(32) + '.part');
    await Promise.all([writeFile(stale, 'x'), writeFile(recent, 'x'), writeFile(temporary, 'x')]);
    const old = new Date(Date.now() - ORPHAN_GRACE_MS - 1000);
    await Promise.all([utimes(stale, old, old), utimes(temporary, old, old), utimes(join(root, active.storageKey), old, old)]);
    await scanOrphanFiles(new Set([published.storageKey]), false);
    expect(await readdir(root)).toEqual(expect.arrayContaining([active.storageKey, published.storageKey, 'tmp', 'c'.repeat(32)]));
    await expect(stat(stale)).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(stat(temporary)).rejects.toMatchObject({ code: 'ENOENT' });
    await scanOrphanFiles(new Set([published.storageKey]), true);
    await expect(stat(recent)).rejects.toMatchObject({ code: 'ENOENT' });
    expect(await readFilePayload('share123', active)).toEqual(Buffer.from('active'));
  });

  it('deletes an already missing object successfully and respects cancellation before reading', async () => {
    const stored = await storeFile('share123', Buffer.from('private'));
    releases.push(stored.releaseActive);
    await expect(readFilePayload('share123', stored, AbortSignal.abort())).rejects.toThrow();
    await deleteStoredFile(stored.storageKey);
    await deleteStoredFile(stored.storageKey);
    await expect(readFilePayload('share123', stored)).rejects.toThrow();
  });
});
