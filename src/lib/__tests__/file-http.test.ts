// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readBoundedBody } from '@/lib/file-http';

function streamed(body: ReadableStream<Uint8Array>) {
  return new Request('http://localhost/upload', { method: 'POST', body, duplex: 'half' } as RequestInit & { duplex: 'half' });
}

afterEach(() => vi.useRealTimers());

describe('bounded file body reads', () => {
  it('handles 100000 small chunks without collecting per-chunk buffers or changing bytes', async () => {
    let count = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (count < 100000) controller.enqueue(Uint8Array.of(count++ % 256));
        else controller.close();
      },
    });
    const result = await readBoundedBody(streamed(body), 110000);
    expect(result.length).toBe(100000);
    expect(result[0]).toBe(0);
    expect(result[99999]).toBe(99999 % 256);
  });

  it('keeps a fixed overall deadline when a slow client keeps sending chunks', async () => {
    vi.useFakeTimers();
    let streamController: ReadableStreamDefaultController<Uint8Array> | undefined;
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      start(controller) { streamController = controller; controller.enqueue(Uint8Array.of(1)); },
      cancel() { cancelled = true; },
    });
    const pending = readBoundedBody(streamed(body), 100);
    const rejected = expect(pending).rejects.toMatchObject({ code: 'REQUEST_TIMEOUT' });
    await vi.advanceTimersByTimeAsync(119000);
    streamController!.enqueue(Uint8Array.of(2));
    await vi.advanceTimersByTimeAsync(1000);
    await rejected;
    expect(cancelled).toBe(true);
  });
});
