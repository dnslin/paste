import { NextResponse } from 'next/server';
import { ApiError, error, INTERNAL_ERROR, NOT_FOUND, RATE_LIMITED } from '@/lib/api-response';

export async function readBoundedBody(request: Request, maximum: number): Promise<Buffer> {
  if (Number(request.headers.get('content-length')) > maximum) throw new ApiError('PAYLOAD_TOO_LARGE', '请求内容过大');
  if (!request.body) return Buffer.alloc(0);
  const reader = request.body.getReader();
  const buffer = Buffer.alloc(maximum);
  let size = 0;
  let onAbort: () => void = () => {};
  let timer: ReturnType<typeof setTimeout> | undefined;
  const interrupted = new Promise<never>((_resolve, reject) => {
    const stop = (cause: ApiError) => {
      reject(cause);
      void reader.cancel(cause).catch((error) => console.error('Cancel file request body failed:', error));
    };
    onAbort = () => stop(new ApiError('REQUEST_ABORTED', '请求已取消'));
    timer = setTimeout(() => stop(new ApiError('REQUEST_TIMEOUT', '请求超时，请重试')), 120000);
    request.signal.addEventListener('abort', onAbort, { once: true });
    if (request.signal.aborted) onAbort();
  });
  const read = async () => {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (size + value.byteLength > maximum) {
        void reader.cancel().catch((error) => console.error('Cancel oversized file body failed:', error));
        throw new ApiError('PAYLOAD_TOO_LARGE', '请求内容过大');
      }
      buffer.set(value, size);
      size += value.byteLength;
    }
    return buffer.subarray(0, size);
  };
  try {
    return await Promise.race([read(), interrupted]);
  } finally {
    clearTimeout(timer);
    request.signal.removeEventListener('abort', onAbort);
    reader.releaseLock();
  }
}

export function fileErrorResponse(cause: unknown, operation: string) {
  if (cause instanceof ApiError) {
    const statuses: Record<string, number> = { [NOT_FOUND]: 404, [RATE_LIMITED]: 429, REQUEST_TIMEOUT: 408, FILE_EXPIRED: 404, FILE_EXHAUSTED: 404, PAYLOAD_TOO_LARGE: 413, INSUFFICIENT_STORAGE: 507 };
    return NextResponse.json(error(cause.code, cause.message), { status: statuses[cause.code] ?? 400, headers: { 'Cache-Control': 'no-store' } });
  }
  console.error(`${operation} failed:`, cause);
  return NextResponse.json(error(INTERNAL_ERROR, '服务发生错误，请稍后重试'), { status: 500, headers: { 'Cache-Control': 'no-store' } });
}

export function attachmentDisposition(fileName: string): string {
  const ascii = fileName.replace(/[^\x20-\x7e]|["\\]/g, '_');
  const encoded = encodeURIComponent(fileName).replace(/['()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}
