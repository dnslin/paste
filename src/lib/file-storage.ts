import { randomBytes } from 'node:crypto';
import { mkdir, readdir, stat, statfs, open, rename, unlink } from 'node:fs/promises';
import path from 'node:path';
import { encryptBytes, decryptBytes } from '@/lib/crypto';
import { ApiError, RATE_LIMITED } from '@/lib/api-response';
import { MAX_FILE_BYTES } from '@/lib/file-rules';

const STORAGE_LIMIT = 1024 * 1024 * 1024;
const DISK_RESERVE = 100 * 1024 * 1024;
const ENCRYPTED_MAX = MAX_FILE_BYTES + 28;
const keyPattern = /^[a-f0-9]{48}\.(bin|tmp)$/;
const globalResources = globalThis as unknown as { fileResources?: { uploads: number; downloads: number; reserved: number; activeKeys: Set<string>; orphanRetries?: Map<string, Set<string>> } };
const resources = globalResources.fileResources ??= { uploads: 0, downloads: 0, reserved: 0, activeKeys: new Set() };
const orphanRetries = resources.orphanRetries ??= new Map<string, Set<string>>();

export function getFileStorageDirectory(): string {
  return path.resolve(process.env.FILE_STORAGE_DIR || path.join(process.cwd(), 'data', 'files'));
}

function storagePath(key: string): string {
  if (!keyPattern.test(key)) throw new Error(`Invalid file storage key: ${key}`);
  return path.join(getFileStorageDirectory(), key);
}

async function ensureDirectory() { await mkdir(getFileStorageDirectory(), { recursive: true, mode: 0o700 }); }

export async function getFileStorageUsage() {
  await ensureDirectory();
  const entries = await readdir(getFileStorageDirectory(), { withFileTypes: true });
  const sizes = await Promise.all(entries.filter((entry) => entry.isFile()).map(async (entry) => {
    try { return (await stat(path.join(getFileStorageDirectory(), entry.name))).size; }
    catch (error) { if (isMissing(error)) return 0; throw error; }
  }));
  return { usedBytes: sizes.reduce((sum, size) => sum + size, 0), reservedBytes: resources.reserved, limitBytes: STORAGE_LIMIT };
}

export async function reserveFileUpload(): Promise<() => void> {
  if (resources.uploads >= 2) throw new ApiError(RATE_LIMITED, '上传繁忙，请稍后重试');
  resources.uploads++;
  resources.reserved += ENCRYPTED_MAX;
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    resources.uploads--;
    resources.reserved -= ENCRYPTED_MAX;
  };
  const reservedAtStart = resources.reserved;
  try {
    const [usage, disk] = await Promise.all([getFileStorageUsage(), ensureDirectory().then(() => statfs(getFileStorageDirectory()))]);
    // An earlier upload can finish and release while this disk snapshot is pending.
    if (usage.usedBytes + reservedAtStart > STORAGE_LIMIT || disk.bavail * disk.bsize < DISK_RESERVE + reservedAtStart) {
      throw new ApiError('INSUFFICIENT_STORAGE', '文件存储空间不足，请稍后重试');
    }
    return release;
  } catch (error) { release(); throw error; }
}

export function reserveFileDownload(): () => void {
  if (resources.downloads >= 4) throw new ApiError(RATE_LIMITED, '下载繁忙，请稍后重试');
  resources.downloads++;
  let released = false;
  return () => { if (!released) { released = true; resources.downloads--; } };
}

export function isMissing(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

export async function removeStoredFile(key: string): Promise<void> {
  try { await unlink(storagePath(key)); }
  catch (error) { if (!isMissing(error)) throw error; }
}

export async function storeFile(bytes: Buffer): Promise<{ storageKey: string; finish: () => void }> {
  const token = randomBytes(24).toString('hex');
  const temporary = `${token}.tmp`;
  const storageKey = `${token}.bin`;
  resources.activeKeys.add(temporary);
  resources.activeKeys.add(storageKey);
  const finish = () => { resources.activeKeys.delete(temporary); resources.activeKeys.delete(storageKey); };
  try {
    await ensureDirectory();
    const encrypted = encryptBytes(bytes);
    const handle = await open(storagePath(temporary), 'wx', 0o600);
    try { await handle.writeFile(encrypted); await handle.sync(); }
    finally { await handle.close(); }
    await rename(storagePath(temporary), storagePath(storageKey));
    return { storageKey, finish };
  } catch (error) {
    for (const key of [temporary, storageKey]) {
      try { await removeStoredFile(key); }
      catch (cleanupError) { queueOrphanCleanup(key); console.error(`Failed to remove incomplete file ${key}:`, cleanupError); }
    }
    finish();
    throw error;
  }
}

export async function readStoredFile(key: string, expectedSize: number): Promise<Buffer> {
  const handle = await open(storagePath(key), 'r');
  try {
    const info = await handle.stat();
    if (info.size !== expectedSize + 28 || info.size > ENCRYPTED_MAX) throw new Error(`Invalid encrypted file size for ${key}`);
    const encrypted = Buffer.alloc(info.size);
    let offset = 0;
    while (offset < encrypted.length) {
      const read = await handle.read(encrypted, offset, encrypted.length - offset, offset);
      if (read.bytesRead === 0) throw new Error(`Incomplete encrypted file ${key}`);
      offset += read.bytesRead;
    }
    return decryptBytes(encrypted);
  } finally { await handle.close(); }
}

export async function removeOrphanFiles(referencedKeys: Set<string>): Promise<{ removed: number; failed: number }> {
  await ensureDirectory();
  const result = { removed: 0, failed: 0 };
  for (const entry of await readdir(getFileStorageDirectory(), { withFileTypes: true })) {
    if (!entry.isFile() || !keyPattern.test(entry.name) || referencedKeys.has(entry.name) || resources.activeKeys.has(entry.name)) continue;
    try { await removeStoredFile(entry.name); result.removed++; }
    catch (error) {
      result.failed++;
      queueOrphanCleanup(entry.name);
      console.error(`Orphan file cleanup failed for ${storagePath(entry.name)}:`, error);
    }
  }
  return result;
}

export function queueOrphanCleanup(key: string): void {
  const directory = getFileStorageDirectory();
  const pending = orphanRetries.get(directory) ?? new Set<string>();
  pending.add(key);
  orphanRetries.set(directory, pending);
}

export async function retryOrphanFiles(isReferenced: (key: string) => boolean): Promise<{ removed: number; failed: number }> {
  const directory = getFileStorageDirectory();
  const pending = orphanRetries.get(directory);
  const result = { removed: 0, failed: 0 };
  if (!pending) return result;
  for (const key of pending) {
    if (isReferenced(key)) { pending.delete(key); continue; }
    if (resources.activeKeys.has(key)) continue;
    try { await removeStoredFile(key); pending.delete(key); result.removed++; }
    catch (error) { result.failed++; console.error(`Orphan file cleanup retry failed for ${storagePath(key)}:`, error); }
  }
  if (pending.size === 0) orphanRetries.delete(directory);
  return result;
}
