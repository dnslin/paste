import { extname } from 'node:path';
import { ApiError, VALIDATION_ERROR } from '@/lib/api-response';
import { FILE_EXTENSIONS, MAX_FILE_BYTES } from '@/lib/file-rules';

const binaryExtensions = new Set(['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'zip']);

export function validateFile(name: string, bytes: Buffer): string {
  if (bytes.length > MAX_FILE_BYTES) throw new ApiError('PAYLOAD_TOO_LARGE', '文件最大为 10 MiB');
  const fileName = name.replace(/[\x00-\x1f\x7f/\\]/g, '_').toWellFormed();
  if (!fileName || fileName.length > 255) throw new ApiError(VALIDATION_ERROR, '文件名须为 1 到 255 个字符');
  const extension = extname(fileName).slice(1).toLowerCase();
  if (!FILE_EXTENSIONS.includes(extension)) throw new ApiError(VALIDATION_ERROR, '支持文本、PDF、PNG、JPEG、GIF、WebP 和 ZIP 文件');
  const starts = (signature: number[]) => bytes.subarray(0, signature.length).equals(Buffer.from(signature));
  let matches = true;
  switch (extension) {
    case 'pdf': matches = bytes.subarray(0, 5).toString('ascii') === '%PDF-'; break;
    case 'png': matches = starts([137, 80, 78, 71, 13, 10, 26, 10]); break;
    case 'jpg': case 'jpeg': matches = starts([255, 216, 255]); break;
    case 'gif': matches = ['GIF87a', 'GIF89a'].includes(bytes.subarray(0, 6).toString('ascii')); break;
    case 'webp': matches = bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP'; break;
    case 'zip': matches = starts([80, 75, 3, 4]) || starts([80, 75, 5, 6]) || starts([80, 75, 7, 8]); break;
    default:
      try { new TextDecoder('utf-8', { fatal: true }).decode(bytes); matches = !bytes.includes(0); }
      catch { matches = false; }
  }
  if (!matches) throw new ApiError(VALIDATION_ERROR, binaryExtensions.has(extension) ? '文件内容与扩展名不符' : '文本文件必须使用 UTF-8 编码');
  return fileName;
}
