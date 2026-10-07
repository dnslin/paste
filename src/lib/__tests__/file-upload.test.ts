// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { contentDisposition, parseFileUpload, sanitizeFileName } from '../file-upload';
import { MAX_FILE_BYTES, MAX_REQUEST_BYTES, UPLOAD_TIMEOUT_MS } from '../file-config';

const boundary = 'test-private-file-boundary';
function request(parts: string[], headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/files', {
    method: 'POST', headers: { 'content-type': `multipart/form-data; boundary=${boundary}`, ...headers },
    body: parts.map((part) => `--${boundary}\r\n${part}\r\n`).join('') + `--${boundary}--\r\n`,
  });
}
function file(name = 'safe.txt', content = 'hello', field = 'file') {
  return `Content-Disposition: form-data; name="${field}"; filename="${name}"\r\nContent-Type: application/octet-stream\r\n\r\n${content}`;
}
function field(name: string, value: string) { return `Content-Disposition: form-data; name="${name}"\r\n\r\n${value}`; }
afterEach(() => vi.useRealTimers());

describe('bounded private multipart upload', () => {
  it('parses one file and uses bounded defaults', async () => {
    expect(await parseFileUpload(request([file()]))).toEqual({ bytes: Buffer.from('hello'), fileName: 'safe.txt', expiresIn: 1440, burnAfterRead: 1 });
  });
  it('preserves opaque binary bytes without MIME parsing', async () => {
    const data = new FormData();
    const binary = new Uint8Array([0, 255, 128, 0, 10]);
    data.append('file', new Blob([binary], { type: 'text/html' }), 'opaque.html');
    data.append('password', '秘密'); data.append('expiresIn', '10080'); data.append('burnAfterRead', '10');
    const parsed = await parseFileUpload(new Request('http://localhost/api/files', { method: 'POST', body: data }));
    expect(parsed).toEqual({ bytes: Buffer.from(binary), fileName: 'opaque.html', password: '秘密', expiresIn: 10080, burnAfterRead: 10 });
  });
  it.each(['NaN', '-1', '1.5', '1e5', `${MAX_REQUEST_BYTES + 1}`])('rejects invalid or oversized content-length %s before reading', async (length) => {
    await expect(parseFileUpload(request([file()], { 'content-length': length }))).rejects.toThrow();
  });
  it('rejects dishonest content-length and actual oversize request bodies', async () => {
    await expect(parseFileUpload(request([file()], { 'content-length': '1' }))).rejects.toThrow();
    await expect(parseFileUpload(request([file('large', 'x'.repeat(MAX_REQUEST_BYTES + 1))]))).rejects.toThrow();
  });
  it('allows exact 10 MiB but rejects an extra byte', async () => {
    const parsed = await parseFileUpload(request([file('edge.bin', 'x'.repeat(MAX_FILE_BYTES))]));
    expect(parsed.bytes.length).toBe(MAX_FILE_BYTES);
    await expect(parseFileUpload(request([file('over.bin', 'x'.repeat(MAX_FILE_BYTES + 1))]))).rejects.toThrow();
  });
  it.each([
    [file(), file('second')], [file(), field('password', 'one'), field('password', 'two')],
    [file(), field('unknown', 'x')], [file(), field('password', 'x'.repeat(300))],
    [file(), field('expiresIn', '0')], [file(), field('expiresIn', '10081')],
    [file(), field('burnAfterRead', '0')], [file(), field('burnAfterRead', '11')],
    [file('', 'missing name')], [file('named', 'content', 'other')], [field('file', 'not a file')],
  ])('rejects duplicate, unexpected, nameless, or invalid parts %#', async (...parts) => {
    await expect(parseFileUpload(request(parts))).rejects.toThrow();
  });
  it('rejects malformed or missing multipart boundaries', async () => {
    await expect(parseFileUpload(new Request('http://localhost/api/files', { method: 'POST', body: 'junk' }))).rejects.toThrow();
    await expect(parseFileUpload(new Request('http://localhost/api/files', { method: 'POST', headers: { 'content-type': 'multipart/form-data; boundary=bad' }, body: 'junk' }))).rejects.toThrow();
  });
  it('cancels a stalled request on deadline and removes the pending timer', async () => {
    vi.useFakeTimers();
    const cancel = vi.fn();
    const stream = new ReadableStream<Uint8Array>({ cancel });
    const req = new Request('http://localhost/api/files', { method: 'POST', headers: { 'content-type': `multipart/form-data; boundary=${boundary}` }, body: stream, duplex: 'half' } as RequestInit);
    const result = expect(parseFileUpload(req)).rejects.toMatchObject({ code: 'UPLOAD_TIMEOUT' });
    await vi.advanceTimersByTimeAsync(UPLOAD_TIMEOUT_MS);
    await result;
    expect(cancel).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('cancels an aborted request', async () => {
    const cancel = vi.fn();
    const controller = new AbortController();
    const stream = new ReadableStream<Uint8Array>({ cancel });
    const req = new Request('http://localhost/api/files', { method: 'POST', headers: { 'content-type': `multipart/form-data; boundary=${boundary}` }, body: stream, signal: controller.signal, duplex: 'half' } as RequestInit);
    const result = expect(parseFileUpload(req)).rejects.toMatchObject({ code: 'REQUEST_ABORTED' });
    controller.abort();
    await result;
    expect(cancel).toHaveBeenCalledOnce();
  });
  it('rejects a streamed nameless file without leaving an unhandled file-stream error', async () => {
    const cancel = vi.fn();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(`--${boundary}\r\nContent-Disposition: form-data; name="file"\r\nContent-Type: application/octet-stream\r\n\r\npartial`));
      }, cancel,
    });
    const req = new Request('http://localhost/api/files', { method: 'POST', headers: { 'content-type': `multipart/form-data; boundary=${boundary}` }, body: stream, duplex: 'half' } as RequestInit);
    await expect(parseFileUpload(req)).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(cancel).toHaveBeenCalledOnce();
  });
});

describe('download names', () => {
  it('removes path fragments and control characters, and bounds UTF-8 length', () => {
    expect(sanitizeFileName('../../folder\\恶意\r\n\u0000.html')).toBe('恶意.html');
    const name = sanitizeFileName('中'.repeat(200) + '😀');
    expect(Buffer.byteLength(name)).toBeLessThanOrEqual(180);
    expect(name).not.toContain('\uFFFD');
    expect(sanitizeFileName('..')).toBe('download');
  });
  it('always uses attachment with an ASCII fallback and safe UTF-8 extended name', () => {
    const header = contentDisposition('资料";\r\nfile.html');
    expect(header).toMatch(/^attachment; filename="[\x20-\x7e]+"; filename\*=UTF-8''/);
    expect(header).not.toMatch(/[\r\n]/);
    expect(header).toContain('%E8%B5%84%E6%96%99');
  });
});
