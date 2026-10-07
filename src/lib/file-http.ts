import { NextRequest, NextResponse } from 'next/server';
import { ApiError, error, INTERNAL_ERROR, VALIDATION_ERROR } from '@/lib/api-response';
import { createRateLimiter } from '@/lib/rate-limit';
import { getClientIp, getPublicOrigin } from '@/lib/request-client';
import { getPasswordError } from '@/lib/paste-rules';

export const FILE_HEADERS = { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' };
export function fileJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: FILE_HEADERS });
}
export function fileError(err: unknown) {
  if (err instanceof ApiError) {
    const statuses: Record<string, number> = { NOT_FOUND: 404, RATE_LIMITED: 429, UNAUTHORIZED: 403,
      GRANT_EXPIRED: 410, EXHAUSTED: 410, BUSY: 503, STORAGE_FULL: 507, PAYLOAD_TOO_LARGE: 413, TIMEOUT: 408, UPLOAD_TIMEOUT: 408, REQUEST_ABORTED: 408, FILE_UNAVAILABLE: 500, INTERNAL_ERROR: 500 };
    const response = fileJson(error(err.code, err.message), statuses[err.code] ?? 400);
    if (err.code === 'BUSY' || err.code === 'RATE_LIMITED') response.headers.set('Retry-After', '5');
    return response;
  }
  if (err instanceof Error && ['TimeoutError', 'AbortError'].includes(err.name)) {
    return fileJson(error('TIMEOUT', '请求已中止或超时，请重试'), 408);
  }
  // Avoid logging bearer values, passwords, filenames or plaintext through error objects.
  console.error('File operation failed');
  return fileJson(error(INTERNAL_ERROR, '文件操作失败，请稍后重试'), 500);
}
export function requireSameOrigin(request: NextRequest, required = false) {
  const origin = request.headers.get('origin');
  if ((required && !origin) || (origin && origin !== getPublicOrigin(request)) ||
      request.headers.get('sec-fetch-site') === 'cross-site') {
    throw new ApiError('UNAUTHORIZED', '请从本站发起文件操作');
  }
}
export function requestDeadline(request: Request, milliseconds: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException('Request timed out', 'TimeoutError')), milliseconds);
  timer.unref();
  return { signal: AbortSignal.any([request.signal, controller.signal]), clear: () => clearTimeout(timer) };
}
export async function readFileJson(request: Request, signal: AbortSignal) {
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(VALIDATION_ERROR, '请求不是有效的 JSON');
  const chunks: Uint8Array[] = []; let length = 0;
  const abort = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener('abort', abort, { once: true });
  try {
    signal.throwIfAborted();
    while (true) {
      const { done, value } = await reader.read(); signal.throwIfAborted();
      if (done) break;
      length += value.length;
      if (length > 2048) throw new ApiError(VALIDATION_ERROR, '请求内容过长');
      chunks.push(value);
    }
    let body: unknown;
    try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch { throw new ApiError(VALIDATION_ERROR, '请求不是有效的 JSON'); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ApiError(VALIDATION_ERROR, '请求内容必须是对象');
    const values = body as Record<string, unknown>;
    if (Object.keys(values).some(key => !['password', 'claimKey'].includes(key))) throw new ApiError(VALIDATION_ERROR, '未知请求字段');
    if (values.password !== undefined && typeof values.password !== 'string') throw new ApiError(VALIDATION_ERROR, '密码必须是字符串');
    const password = values.password as string | undefined;
    const invalid = password === undefined ? null : getPasswordError(password);
    if (invalid) throw new ApiError(VALIDATION_ERROR, invalid);
    return { password, claimKey: values.claimKey };
  } finally {
    signal.removeEventListener('abort', abort); void reader.cancel().catch(() => {}); reader.releaseLock();
  }
}

const readLimiter = createRateLimiter({ maxTokens: 60, refillRate: 60, refillInterval: 60000 });
export function requireFileReadRate(request: NextRequest) {
  if (!readLimiter.consume(getClientIp(request)).allowed) {
    throw new ApiError('RATE_LIMITED', '文件请求过多，请稍后重试');
  }
}
