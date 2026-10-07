import busboy from 'busboy';
import { ApiError } from './api-response';
import { FILE_TTL_MINUTES, MAX_FILE_BYTES, MAX_FILE_NAME_BYTES, MAX_FILE_TTL_MINUTES, MAX_REQUEST_BYTES, UPLOAD_TIMEOUT_MS } from './file-config';
import { getPasswordError } from './paste-rules';

export interface ParsedFileUpload {
  bytes: Buffer;
  fileName: string;
  password?: string;
  expiresIn: number;
  burnAfterRead: number;
}

export function sanitizeFileName(input: string): string {
  // Both path separator styles are stripped regardless of the server OS.
  const basename = input.replace(/\\/g, '/').split('/').pop() ?? '';
  // Also remove invisible bidi overrides that can disguise executable suffixes.
  const cleaned = basename.replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, '').trim().toWellFormed();
  let output = '';
  let length = 0;
  for (const character of cleaned) {
    const bytes = Buffer.byteLength(character, 'utf8');
    if (length + bytes > MAX_FILE_NAME_BYTES) break;
    output += character;
    length += bytes;
  }
  return !output || /^\.+$/.test(output) ? 'download' : output;
}

export function contentDisposition(fileName: string): string {
  const safe = sanitizeFileName(fileName);
  const fallback = safe.replace(/[^a-zA-Z0-9 ._()-]/g, '_');
  const encoded = encodeURIComponent(safe).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

function invalid(message = '无效的文件上传请求'): ApiError {
  return new ApiError('VALIDATION_ERROR', message);
}

export async function parseFileUpload(request: Request, signal?: AbortSignal): Promise<ParsedFileUpload> {
  const lengthHeader = request.headers.get('content-length');
  let declaredLength: number | undefined;
  if (lengthHeader !== null) {
    if (!/^\d+$/.test(lengthHeader) || !Number.isSafeInteger(Number(lengthHeader))) throw invalid();
    declaredLength = Number(lengthHeader);
    if (declaredLength > MAX_REQUEST_BYTES) throw new ApiError('PAYLOAD_TOO_LARGE', '上传请求不能超过 11 MiB');
  }
  if (!request.body || !/^multipart\/form-data(?:\s*;|$)/i.test(request.headers.get('content-type') ?? '')) throw invalid();
  let parser: ReturnType<typeof busboy>;
  try {
    parser = busboy({
      headers: { 'content-type': request.headers.get('content-type')! },
      defParamCharset: 'utf8', preservePath: true,
      // Busboy's partsLimit event fires when the limit is reached, rather
      // than exceeded. Four legitimate parts must fit before that event.
      limits: { files: 1, fields: 3, parts: 5, fieldNameSize: 64, fieldSize: 256, fileSize: MAX_FILE_BYTES + 1, headerPairs: 32 },
    });
  } catch { throw invalid(); }

  const reader = request.body.getReader();
  const fields = new Map<string, string>();
  const chunks: Buffer[] = [];
  let fileName: string | undefined;
  let fileBytes = 0;
  let totalBytes = 0;
  let failure: Error | undefined;
  let abort!: (error: Error) => void;
  const failed = new Promise<never>((_resolve, reject) => { abort = reject; });
  // Events can fail before the next race has been installed.
  void failed.catch(() => undefined);
  const fail = (error: Error) => { if (!failure) { failure = error; abort(error); } };
  const onAbort = () => fail(new ApiError('REQUEST_ABORTED', '请求已取消'));
  const signals = [...new Set([request.signal, signal].filter((entry): entry is AbortSignal => !!entry))];
  signals.forEach((entry) => entry.addEventListener('abort', onAbort, { once: true }));
  const timeout = setTimeout(() => fail(new ApiError('UPLOAD_TIMEOUT', '上传超时，请重新选择文件')), UPLOAD_TIMEOUT_MS);
  timeout.unref?.();
  const complete = new Promise<void>((resolve) => { parser.once('close', resolve); });
  parser.on('error', () => fail(invalid('文件上传不完整或格式无效')));
  parser.on('filesLimit', () => fail(invalid('每次只能上传一个文件')));
  parser.on('fieldsLimit', () => fail(invalid('上传字段过多')));
  parser.on('partsLimit', () => fail(invalid('上传字段过多')));
  parser.on('field', (name, value, info) => {
    if (!['password', 'expiresIn', 'burnAfterRead'].includes(name) || fields.has(name) || info.nameTruncated || info.valueTruncated || name.length > 64) {
      fail(invalid('上传字段重复、过长或不受支持'));
      return;
    }
    fields.set(name, value);
  });
  parser.on('file', (name, stream, info) => {
    // Rejected files can still emit an error when the parser is destroyed.
    stream.on('error', () => fail(invalid('文件上传不完整')));
    if (name !== 'file' || fileName !== undefined || !info.filename || !info.filename.trim()) {
      stream.resume();
      fail(invalid('请选择一个有文件名的文件'));
      return;
    }
    fileName = sanitizeFileName(info.filename);
    stream.on('limit', () => fail(new ApiError('PAYLOAD_TOO_LARGE', '文件不能超过 10 MiB')));
    stream.on('data', (chunk: Buffer) => {
      if (failure) return;
      fileBytes += chunk.length;
      if (fileBytes > MAX_FILE_BYTES) { fail(new ApiError('PAYLOAD_TOO_LARGE', '文件不能超过 10 MiB')); return; }
      chunks.push(chunk);
    });
  });

  let succeeded = false;
  try {
    if (signals.some((entry) => entry.aborted)) onAbort();
    while (true) {
      if (failure) throw failure;
      const result = await Promise.race([reader.read(), failed]);
      if (result.done) break;
      totalBytes += result.value.byteLength;
      if (totalBytes > MAX_REQUEST_BYTES) throw new ApiError('PAYLOAD_TOO_LARGE', '上传请求不能超过 11 MiB');
      // Writable callbacks provide backpressure without retaining unbounded chunks.
      await Promise.race([new Promise<void>((resolve, reject) => {
        parser.write(result.value, (error?: Error | null) => error ? reject(invalid()) : resolve());
      }), failed]);
    }
    if (declaredLength !== undefined && totalBytes !== declaredLength) throw invalid('请求长度不匹配');
    parser.end();
    await Promise.race([complete, failed]);
    if (failure) throw failure;
    if (fileName === undefined) throw invalid('请选择一个文件');
    const password = fields.get('password');
    if (password !== undefined) {
      const passwordError = getPasswordError(password);
      if (passwordError) throw invalid(passwordError);
    }
    const numeric = (name: string, fallback: number, maximum: number): number => {
      const input = fields.get(name);
      if (input === undefined) return fallback;
      if (!/^\d+$/.test(input)) throw invalid('过期时间或领取次数无效');
      const value = Number(input);
      if (!Number.isSafeInteger(value) || value < 1 || value > maximum) throw invalid('过期时间或领取次数无效');
      return value;
    };
    const expiresIn = numeric('expiresIn', FILE_TTL_MINUTES, MAX_FILE_TTL_MINUTES);
    const burnAfterRead = numeric('burnAfterRead', 1, 10);
    succeeded = true;
    return { bytes: Buffer.concat(chunks, fileBytes), fileName, ...(password ? { password } : {}), expiresIn, burnAfterRead };
  } finally {
    clearTimeout(timeout);
    signals.forEach((entry) => entry.removeEventListener('abort', onAbort));
    if (!succeeded) {
      // Do not wait for an untrusted or stalled stream's cancel implementation.
      void reader.cancel().catch(() => undefined);
    }
    parser.destroy();
    reader.releaseLock();
    chunks.length = 0;
  }
}
