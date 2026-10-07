// @vitest-environment node
import { EventEmitter } from 'node:events';
import type { ServerResponse } from 'node:http';
import { afterEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { pipeToNodeResponse } from 'next/dist/server/pipe-readable';
import { acquirePayloadSlot } from '@/lib/file-storage';
import { PAYLOAD_TIMEOUT_MS } from '@/lib/file-config';
import { GET } from '../files/[id]/download/route';

vi.mock('@/lib/files', () => ({
  authorizeDownload: () => ({ file: { fileName: 'payload.bin', size: 128 * 1024 } }),
}));
vi.mock('@/lib/file-storage', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/file-storage')>(),
  readFilePayload: async () => Buffer.alloc(128 * 1024),
}));

// Exercise the installed Next adapter rather than an eagerly consumed Blob.
// The final write remains pending until the test simulates a socket drain.
class BackpressuredResponse extends EventEmitter {
  writableFinished = false;
  destroyed = false;
  writes = 0;
  lastChunk: Uint8Array | undefined;
  private notifyBlocked!: () => void;
  readonly blocked = new Promise<void>((resolve) => { this.notifyBlocked = resolve; });

  flushHeaders() {}
  write(chunk: Uint8Array) {
    this.lastChunk = chunk;
    this.writes++;
    if (this.writes !== 2) return true;
    this.notifyBlocked();
    return false;
  }
  end() { this.writableFinished = true; this.emit('finish'); }
  destroy() { this.destroyed = true; this.emit('close'); }
}

const releases: Array<() => void> = [];
afterEach(() => {
  releases.splice(0).forEach((release) => release());
  vi.useRealTimers();
});

async function startBlockedDownload() {
  const request = new NextRequest('http://localhost:3000/api/files/share/download', {
    headers: { authorization: 'Bearer test-grant' },
  });
  const response = await GET(request, { params: Promise.resolve({ id: 'share' }) });
  expect(response.status).toBe(200);
  const sink = new BackpressuredResponse();
  const complete = pipeToNodeResponse(response.body!, sink as unknown as ServerResponse)
    .then(() => 'finished', () => 'aborted');
  await sink.blocked;
  return { sink, complete };
}

it('keeps its payload slot until the final response write drains', async () => {
  const { sink, complete } = await startBlockedDownload();
  try {
    expect(sink.writableFinished).toBe(false);
    releases.push(acquirePayloadSlot());
    expect(() => { releases.push(acquirePayloadSlot()); }).toThrow(/繁忙/);
  } finally {
    sink.emit('drain');
    await complete;
  }
  expect(sink.writableFinished).toBe(true);
  // The other reservation is still held, so this succeeds only after EOF released the download.
  releases.push(acquirePayloadSlot());
});

it('times out a blocked final write without leaving the whole payload in its queued chunk', async () => {
  vi.useFakeTimers();
  const { sink, complete } = await startBlockedDownload();
  try {
    expect(sink.lastChunk?.byteLength).toBe(64 * 1024);
    expect(sink.lastChunk?.buffer.byteLength).toBe(64 * 1024);
    await vi.advanceTimersByTimeAsync(PAYLOAD_TIMEOUT_MS);
    // Both full-payload slots are available even though transport drain has not finished.
    releases.push(acquirePayloadSlot());
    releases.push(acquirePayloadSlot());
    expect(() => { releases.push(acquirePayloadSlot()); }).toThrow(/繁忙/);
    expect(sink.writableFinished).toBe(false);
  } finally {
    // Next waits for its in-progress write before propagating abort to the socket.
    sink.emit('drain');
    await complete;
  }
  expect(await complete).toBe('aborted');
  expect(sink.destroyed).toBe(true);
});
