// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deleteStoredFile, ensureFileStorage, getFileStorageDirectory, readFilePayload, reserveUpload, storeFile } from '../file-storage';
import { MIN_FREE_DISK_BYTES, MAX_FILE_BYTES } from '../file-config';

const faults = vi.hoisted(() => ({
  availableBytes: undefined as bigint | undefined,
  rename: false, write: false, unlink: false,
  keys: [] as string[],
}));

vi.mock('node:crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:crypto')>();
  return { ...actual, randomBytes: (size: number) => {
    const key = size === 16 ? faults.keys.shift() : undefined;
    return key === undefined ? actual.randomBytes(size) : Buffer.from(key, 'hex');
  } };
});

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...actual,
    statfs: async (...args: Parameters<typeof actual.statfs>) => {
      if (faults.availableBytes !== undefined) return { bavail: faults.availableBytes, bsize: BigInt(1) };
      return actual.statfs(...args);
    },
    open: async (...args: Parameters<typeof actual.open>) => {
      const handle = await actual.open(...args);
      if (faults.write && String(args[0]).endsWith('.part')) {
        handle.writeFile = async () => { throw Object.assign(new Error('Disk full'), { code: 'ENOSPC' }); };
      }
      return handle;
    },
    rename: async (...args: Parameters<typeof actual.rename>) => {
      if (faults.rename) throw Object.assign(new Error('Rename failed'), { code: 'EIO' });
      return actual.rename(...args);
    },
    unlink: async (...args: Parameters<typeof actual.unlink>) => {
      if (faults.unlink) throw Object.assign(new Error('Unlink failed'), { code: 'EACCES' });
      return actual.unlink(...args);
    },
  };
});

let directory: string;
const releases: Array<() => void> = [];

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'paste-file-faults-'));
  vi.spyOn(process, 'cwd').mockReturnValue(directory);
  vi.stubEnv('ENCRYPTION_KEY', 'ab'.repeat(32));
});

afterEach(async () => {
  releases.splice(0).forEach((release) => release());
  faults.availableBytes = undefined;
  faults.rename = faults.write = faults.unlink = false;
  faults.keys = [];
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  await rm(directory, { recursive: true, force: true });
});

describe('file storage failures and recovery', () => {
  it('retains the configured free disk floor including existing upload reservations', async () => {
    faults.availableBytes = BigInt(MIN_FREE_DISK_BYTES + MAX_FILE_BYTES);
    const release = await reserveUpload();
    releases.push(release);
    await expect(reserveUpload()).rejects.toMatchObject({ code: 'STORAGE_FULL' });
    release();
    release();
    releases.push(await reserveUpload());
  });

  it.each(['write', 'rename'] as const)('removes incomplete and unpublished files when %s fails', async (failure) => {
    faults[failure] = true;
    await expect(storeFile('share123', Buffer.from('private'))).rejects.toThrow();
    expect(await readdir(getFileStorageDirectory())).toEqual(['tmp']);
    expect(await readdir(join(getFileStorageDirectory(), 'tmp'))).toEqual([]);
  });

  it('never overwrites an existing object when a generated destination collides', async () => {
    await ensureFileStorage();
    const collision = 'a'.repeat(32);
    const next = 'b'.repeat(32);
    faults.keys = [collision, next];
    await writeFile(join(getFileStorageDirectory(), collision), 'existing');
    const stored = await storeFile('share123', Buffer.from('private'));
    releases.push(stored.releaseActive);
    expect(stored.storageKey).toBe(next);
    expect(await readFile(join(getFileStorageDirectory(), collision), 'utf8')).toBe('existing');
    expect(await readFilePayload('share123', stored)).toEqual(Buffer.from('private'));
    expect(await readdir(join(getFileStorageDirectory(), 'tmp'))).toEqual([]);
  });

  it('does not follow ciphertext symlinks outside the private directory', async () => {
    const stored = await storeFile('share123', Buffer.from('private'));
    releases.push(stored.releaseActive);
    const external = join(directory, 'external');
    const path = join(getFileStorageDirectory(), stored.storageKey);
    const ciphertext = await readFile(path);
    await writeFile(external, ciphertext);
    await rm(path);
    await symlink(external, path);
    await expect(readFilePayload('share123', stored)).rejects.toThrow();
  });

  it('propagates unlink failures so database cleanup can keep deleting state and retry', async () => {
    const stored = await storeFile('share123', Buffer.from('private'));
    releases.push(stored.releaseActive);
    faults.unlink = true;
    await expect(deleteStoredFile(stored.storageKey)).rejects.toMatchObject({ code: 'EACCES' });
    expect(await readFilePayload('share123', stored)).toEqual(Buffer.from('private'));
    faults.unlink = false;
    await deleteStoredFile(stored.storageKey);
  });
});
