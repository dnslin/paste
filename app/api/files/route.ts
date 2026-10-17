import { NextRequest, NextResponse } from 'next/server';
import { ApiError, success, VALIDATION_ERROR, RATE_LIMITED } from '@/lib/api-response';
import { getClientIp, getPublicOrigin } from '@/lib/request-client';
import { createRateLimiter } from '@/lib/rate-limit';
import { MAX_UPLOAD_BYTES } from '@/lib/file-rules';
import { createFileShare } from '@/lib/file-share';
import { reserveFileUpload } from '@/lib/file-storage';
import { readBoundedBody, fileErrorResponse } from '@/lib/file-http';

export const runtime = 'nodejs';
const uploads = createRateLimiter({ maxTokens: 3, refillRate: 3, refillInterval: 60000 });

export async function POST(request: NextRequest) {
  let release: (() => void) | undefined;
  try {
    if (!uploads.consume(getClientIp(request)).allowed) throw new ApiError(RATE_LIMITED, '上传请求过多，请稍后重试');
    release = await reserveFileUpload();
    const bytes = await readBoundedBody(request, MAX_UPLOAD_BYTES);
    let form: FormData;
    try { form = await new Request(request.url, { method: 'POST', headers: request.headers, body: new Uint8Array(bytes) }).formData(); }
    catch { throw new ApiError(VALIDATION_ERROR, '上传请求格式不正确'); }
    const allowed = new Set(['file', 'password', 'expiresIn', 'downloadLimit']);
    for (const key of form.keys()) {
      if (!allowed.has(key) || form.getAll(key).length !== 1) throw new ApiError(VALIDATION_ERROR, '上传字段无效或重复');
    }
    const file = form.get('file');
    if (!(file instanceof File)) throw new ApiError(VALIDATION_ERROR, '请选择一个文件');
    for (const key of ['password', 'expiresIn', 'downloadLimit']) {
      if (form.has(key) && typeof form.get(key) !== 'string') throw new ApiError(VALIDATION_ERROR, '分享选项必须是文本');
    }
    const expires = form.get('expiresIn');
    const limit = form.get('downloadLimit');
    const created = await createFileShare({ fileName: file.name, bytes: Buffer.from(await file.arrayBuffer()),
      password: form.get('password')?.toString(), expiresIn: expires === null ? 1440 : Number(expires),
      downloadLimit: limit === null || limit === 'off' ? null : Number(limit), signal: request.signal });
    return NextResponse.json(success({ ...created, url: new URL(`/f/${created.id}`, getPublicOrigin(request)).href }), { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (cause) { return fileErrorResponse(cause, 'Create file share'); }
  finally { release?.(); }
}
