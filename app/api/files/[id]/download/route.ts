import { NextRequest } from 'next/server';
import { ApiError, RATE_LIMITED, VALIDATION_ERROR } from '@/lib/api-response';
import { createRateLimiter } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/request-client';
import { getPasswordError } from '@/lib/paste-rules';
import { claimFileDownload } from '@/lib/file-share';
import { reserveFileDownload } from '@/lib/file-storage';
import { readBoundedBody, fileErrorResponse, attachmentDisposition } from '@/lib/file-http';

export const runtime = 'nodejs';
const downloads = createRateLimiter({ maxTokens: 10, refillRate: 10, refillInterval: 60000 });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let release: (() => void) | undefined;
  try {
    if (request.headers.has('range')) throw new ApiError(VALIDATION_ERROR, '不支持分段下载');
    const ip = getClientIp(request);
    if (!downloads.consume(ip).allowed) throw new ApiError(RATE_LIMITED, '下载请求过多，请稍后重试');
    release = reserveFileDownload();
    const raw = await readBoundedBody(request, 8192);
    let body: unknown;
    try { body = JSON.parse(raw.toString('utf8')); }
    catch { throw new ApiError(VALIDATION_ERROR, '请求不是有效的 JSON'); }
    if (typeof body !== 'object' || body === null || Array.isArray(body)) throw new ApiError(VALIDATION_ERROR, '请求内容必须是对象');
    const { password } = body as Record<string, unknown>;
    if (password !== undefined && typeof password !== 'string') throw new ApiError(VALIDATION_ERROR, '密码必须是字符串');
    const passwordError = typeof password === 'string' ? getPasswordError(password) : null;
    if (passwordError) throw new ApiError(VALIDATION_ERROR, passwordError);
    request.signal.throwIfAborted();
    const claimed = await claimFileDownload(id, password, ip, request.signal);
    const releaseSlot = release;
    let onAbort: (() => void) | undefined;
    const done = () => {
      releaseSlot();
      if (onAbort) request.signal.removeEventListener('abort', onAbort);
    };
    const headers = { 'Content-Type': 'application/octet-stream', 'Content-Length': String(claimed.bytes.length),
      'Content-Disposition': attachmentDisposition(claimed.fileName), 'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store', 'X-File-Name': encodeURIComponent(claimed.fileName),
      'X-Downloads-Remaining': claimed.downloadsRemaining === null ? 'unlimited' : String(claimed.downloadsRemaining) };
    // The slot belongs to the response until its buffered body drains or is cancelled.
    let offset = 0;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        onAbort = () => { controller.error(new Error('Download request aborted')); done(); };
        request.signal.addEventListener('abort', onAbort, { once: true });
        if (request.signal.aborted) onAbort();
      },
      pull(controller) {
        if (offset < claimed.bytes.length) {
          const end = Math.min(offset + 64 * 1024, claimed.bytes.length);
          controller.enqueue(new Uint8Array(claimed.bytes.subarray(offset, end)));
          offset = end;
        } else { controller.close(); done(); }
      },
      cancel() { done(); },
    }, { highWaterMark: 0 });
    const response = new Response(stream, { headers });
    release = undefined;
    return response;
  } catch (cause) { return fileErrorResponse(cause, `Download file ${id}`); }
  finally { release?.(); }
}
