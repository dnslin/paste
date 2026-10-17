export interface FileShareOptions {
  password: string
  expiresIn: number
  downloadLimit: number | null
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KiB`
  return `${bytes} B`
}

export function formatExpiry(expiresAt: string) {
  return `${new Date(expiresAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })} 到期（北京时间）`
}

export function responseError(status: number, body: unknown): string {
  if (body && typeof body === 'object' && 'success' in body && body.success === false && 'error' in body
    && body.error && typeof body.error === 'object' && 'message' in body.error && typeof body.error.message === 'string') return body.error.message
  if (status === 413) return '文件超过上传限制，请选择不超过 10 MiB 的文件。'
  if (status === 429) return '请求过于频繁，请稍后重试。'
  return '请求失败，请稍后重试。'
}
