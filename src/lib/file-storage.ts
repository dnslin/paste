import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { constants } from 'node:fs';
import { chmod, lstat, mkdir, open, readdir, rename, statfs, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { ApiError } from './api-response';
import { FILE_QUOTA_BYTES, MAX_FILE_BYTES, MAX_PAYLOADS, MIN_FREE_DISK_BYTES, ORPHAN_GRACE_MS } from './file-config';

interface StorageState {
  payloads: number;
  reservedBytes: number;
  reservationQueue: Promise<void>;
  activePaths: Set<string>;
}

// Shared by independently bundled Next.js routes and development module reloads.
const processState = globalThis as typeof globalThis & { __pasteFileStorage?: StorageState };
function state(): StorageState {
  return processState.__pasteFileStorage ??= {
    payloads: 0, reservedBytes: 0, reservationQueue: Promise.resolve(), activePaths: new Set(),
  };
}

export interface FilePayloadMetadata {
  storageKey: string;
  encryptionVersion: number;
  nonce: string;
  tag: string;
  size: number;
}

export interface StoredFile extends FilePayloadMetadata {
  encryptionVersion: 1;
  // The caller releases this only after database commit or compensation.
  releaseActive: () => void;
}

function once(action: () => void): () => void {
  let released = false;
  return () => {
    if (released) return;
    released = true;
    action();
  };
}

export function getFileStorageDirectory(): string {
  // Intentionally no configurable arbitrary/static directory in v1.
  return join(process.cwd(), 'data', 'files');
}

function hasCode(error: unknown, code: string): boolean {
  return error instanceof Error && 'code' in error && error.code === code;
}

async function privateDirectory(path: string, setMode: boolean): Promise<void> {
  try {
    await mkdir(path, { mode: 0o700 });
  } catch (error) {
    if (!hasCode(error, 'EEXIST')) throw error;
  }
  const info = await lstat(path);
  if (!info.isDirectory() || info.isSymbolicLink()) {
    throw new Error('File storage must use private real directories');
  }
  if (setMode) await chmod(path, 0o700);
}

export async function ensureFileStorage(): Promise<void> {
  await privateDirectory(join(process.cwd(), 'data'), false);
  const root = getFileStorageDirectory();
  await privateDirectory(root, true);
  await privateDirectory(join(root, 'tmp'), true);
}

export function acquirePayloadSlot(): () => void {
  const current = state();
  if (current.payloads >= MAX_PAYLOADS) {
    throw new ApiError('BUSY', '文件服务繁忙，请稍后重试');
  }
  current.payloads++;
  return once(() => { current.payloads--; });
}

async function storageBytes(root: string): Promise<number> {
  let bytes = 0;
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.name === 'tmp' && entry.isDirectory()) {
      bytes += await storageBytes(path);
      continue;
    }
    // Unexpected nested directories are not an excuse to under-count quota.
    const info = await lstat(path).catch((error: unknown) => {
      if (hasCode(error, 'ENOENT')) return null;
      throw error;
    });
    if (!info) continue;
    if (info.isDirectory()) throw new Error('Unexpected directory in file storage');
    bytes += info.size;
  }
  return bytes;
}

export async function reserveUpload(): Promise<() => void> {
  const current = state();
  const prior = current.reservationQueue;
  let unlock!: () => void;
  current.reservationQueue = new Promise<void>((resolve) => { unlock = resolve; });
  await prior;
  try {
    await ensureFileStorage();
    const root = getFileStorageDirectory();
    const [used, disk] = await Promise.all([storageBytes(root), statfs(root, { bigint: true })]);
    const reserved = current.reservedBytes + MAX_FILE_BYTES;
    if (used + reserved > FILE_QUOTA_BYTES || disk.bavail * disk.bsize < BigInt(MIN_FREE_DISK_BYTES + reserved)) {
      throw new ApiError('STORAGE_FULL', '文件存储空间不足，请稍后重试');
    }
    current.reservedBytes += MAX_FILE_BYTES;
    return once(() => { current.reservedBytes -= MAX_FILE_BYTES; });
  } finally {
    unlock();
  }
}

function keyBytes(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || !/^[a-fA-F0-9]{64}$/.test(key)) throw new Error('ENCRYPTION_KEY must be 64 hex characters');
  return Buffer.from(key, 'hex');
}

function aad(id: string): Buffer {
  if (!id || id.length > 128) throw new ApiError('VALIDATION_ERROR', '无效的分享标识');
  return Buffer.from(`paste:file:v1\0${id}`, 'utf8');
}

function objectPath(storageKey: string): string {
  if (!/^[a-f0-9]{32}$/.test(storageKey)) throw new ApiError('FILE_UNAVAILABLE', '文件暂时不可用');
  return join(getFileStorageDirectory(), storageKey);
}

function checkAbort(signal?: AbortSignal): void {
  if (signal?.aborted) throw new ApiError('REQUEST_ABORTED', '请求已取消');
}

async function syncDirectory(path: string): Promise<void> {
  const handle = await open(path, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
  try { await handle.sync(); } finally { await handle.close(); }
}

async function unlinkIfPresent(path: string): Promise<void> {
  try { await unlink(path); } catch (error) {
    if (!hasCode(error, 'ENOENT')) throw error;
  }
}

export async function storeFile(id: string, bytes: Buffer, signal?: AbortSignal): Promise<StoredFile> {
  if (bytes.length > MAX_FILE_BYTES) throw new ApiError('PAYLOAD_TOO_LARGE', '文件不能超过 10 MiB');
  checkAbort(signal);
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyBytes(), nonce);
  cipher.setAAD(aad(id));
  const ciphertext = Buffer.concat([cipher.update(bytes), cipher.final()]);
  const tag = cipher.getAuthTag();
  await ensureFileStorage();
  const root = getFileStorageDirectory();
  const temporaryRoot = join(root, 'tmp');

  for (let attempt = 0; attempt < 8; attempt++) {
    checkAbort(signal);
    const storageKey = randomBytes(16).toString('hex');
    const temporary = join(temporaryRoot, `${storageKey}.part`);
    const destination = objectPath(storageKey);
    const active = state().activePaths;
    if (active.has(temporary) || active.has(destination)) continue;
    let ownTemporary = false;
    let ownDestination = false;
    active.add(temporary);
    active.add(destination);
    const releaseActive = once(() => { active.delete(temporary); active.delete(destination); });
    try {
      const handle = await open(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
      ownTemporary = true;
      try {
        checkAbort(signal);
        await handle.writeFile(ciphertext, { signal });
        await handle.sync();
      } finally { await handle.close(); }
      checkAbort(signal);
      // POSIX rename replaces its destination. Reserve it exclusively first, so
      // only this upload's empty placeholder can ever be replaced by the rename.
      const reservation = await open(destination, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
      ownDestination = true;
      await reservation.close();
      checkAbort(signal);
      await rename(temporary, destination);
      ownTemporary = false;
      await Promise.all([syncDirectory(root), syncDirectory(temporaryRoot)]);
      checkAbort(signal);
      return { storageKey, encryptionVersion: 1, nonce: nonce.toString('hex'), tag: tag.toString('hex'), size: bytes.length, releaseActive };
    } catch (error) {
      const cleanup = await Promise.allSettled([
        ownTemporary ? unlinkIfPresent(temporary) : Promise.resolve(),
        ownDestination ? unlinkIfPresent(destination) : Promise.resolve(),
      ]);
      releaseActive();
      if (cleanup.some((result) => result.status === 'rejected')) {
        console.error('File upload compensation failed; orphan cleanup will retry');
      }
      if (hasCode(error, 'EEXIST')) continue;
      throw error;
    }
  }
  throw new ApiError('INTERNAL_ERROR', '无法创建文件，请稍后重试');
}

export async function readFilePayload(id: string, metadata: FilePayloadMetadata, signal?: AbortSignal): Promise<Buffer> {
  checkAbort(signal);
  if (metadata.encryptionVersion !== 1 || !/^[a-fA-F0-9]{24}$/.test(metadata.nonce) || !/^[a-fA-F0-9]{32}$/.test(metadata.tag)
    || !Number.isSafeInteger(metadata.size) || metadata.size < 0 || metadata.size > MAX_FILE_BYTES) {
    throw new ApiError('FILE_UNAVAILABLE', '文件暂时不可用');
  }
  const path = objectPath(metadata.storageKey);
  await ensureFileStorage();
  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  let plaintext: Buffer | undefined;
  try {
    const info = await handle.stat();
    if (!info.isFile() || info.size !== metadata.size || info.size > MAX_FILE_BYTES) throw new Error('Invalid encrypted file size');
    checkAbort(signal);
    const ciphertext = Buffer.alloc(metadata.size);
    let offset = 0;
    while (offset < ciphertext.length) {
      checkAbort(signal);
      const result = await handle.read(ciphertext, offset, ciphertext.length - offset, offset);
      if (result.bytesRead === 0) throw new Error('Incomplete encrypted file');
      offset += result.bytesRead;
    }
    if ((await handle.read(Buffer.alloc(1), 0, 1, offset)).bytesRead !== 0) throw new Error('Encrypted file grew during read');
    checkAbort(signal);
    const decipher = createDecipheriv('aes-256-gcm', keyBytes(), Buffer.from(metadata.nonce, 'hex'));
    decipher.setAAD(aad(id));
    decipher.setAuthTag(Buffer.from(metadata.tag, 'hex'));
    plaintext = decipher.update(ciphertext);
    const final = decipher.final();
    checkAbort(signal);
    // No caller can access bytes before final() authenticates the entire file.
    return final.length ? Buffer.concat([plaintext, final]) : plaintext;
  } catch (error) {
    plaintext?.fill(0);
    if (error instanceof ApiError) throw error;
    throw new ApiError('FILE_UNAVAILABLE', '文件暂时不可用');
  } finally { await handle.close(); }
}

export async function deleteStoredFile(storageKey: string): Promise<void> {
  const path = objectPath(storageKey);
  await ensureFileStorage();
  await unlinkIfPresent(path);
  await syncDirectory(getFileStorageDirectory());
}

export async function scanOrphanFiles(referencedKeys: Set<string>, startup: boolean): Promise<void> {
  await ensureFileStorage();
  const root = getFileStorageDirectory();
  const cutoff = Date.now() - ORPHAN_GRACE_MS;
  for (const directory of [root, join(root, 'tmp')]) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (directory === root && entry.name === 'tmp') continue;
      const path = join(directory, entry.name);
      if (state().activePaths.has(path) || (directory === root && referencedKeys.has(entry.name))) continue;
      const info = await lstat(path).catch((error: unknown) => {
        if (hasCode(error, 'ENOENT')) return null;
        throw error;
      });
      if (!info || (!startup && info.mtimeMs > cutoff)) continue;
      if (info.isDirectory()) throw new Error('Unexpected directory in file storage');
      // Recheck after the asynchronous stat; active uploads may have started.
      if (!state().activePaths.has(path)) await unlinkIfPresent(path);
    }
    await syncDirectory(directory);
  }
}
