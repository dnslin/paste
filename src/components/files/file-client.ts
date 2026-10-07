import type { ApiResponse } from '@/lib/api-response'

export interface FileMetadata {
  fileName: string
  size: number
  expiresAt: string
  burnCount: number
}

export class FileRequestError extends Error {
  constructor(message: string, readonly code: string, readonly status: number) { super(message) }
}

export async function fileResponse<T>(response: Response): Promise<T> {
  const body: ApiResponse<T> = await response.json()
  if (!body.success) throw new FileRequestError(body.error.message, body.error.code, response.status)
  if (!response.ok) throw new FileRequestError('请求失败，请稍后重试。', 'UNKNOWN', response.status)
  return body.data
}

export function formatFileSize(size: number) {
  return size < 1024 ? `${size} B` : size < 1024 * 1024 ? `${(size / 1024).toFixed(1)} KiB` : `${(size / (1024 * 1024)).toFixed(1)} MiB`
}

export function downloadName(header: string | null, fallback: string) {
  const encoded = header?.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
  try { return encoded ? decodeURIComponent(encoded) : fallback } catch { return fallback }
}
