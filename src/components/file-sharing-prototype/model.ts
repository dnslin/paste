export const MAX_FILE_BYTES = 10 * 1024 * 1024

export interface ShareOptions {
  password: string
  expiresIn: number
  limit: number | null
}

export type ShareItem =
  | { kind: 'file'; file: File }
  | { kind: 'text'; content: string; language: string }

export interface PrototypeShare {
  item: ShareItem
  options: ShareOptions
}

export const EXAMPLE_CONTENT = '# 项目交付说明\n\n这是一份用于体验文件分享的示例文档。\n\n## 交付内容\n\n- 界面与交互说明\n- 项目部署步骤\n- 功能验收清单\n\n此文件由当前浏览器生成，没有上传到服务器。\n'

export function exampleFile() {
  return new File([EXAMPLE_CONTENT], '项目交付说明.md', { type: 'text/markdown' })
}

export function getFileError(files: File[]): string | null {
  if (files.length !== 1) return '每条分享只能选择一个文件，请重新选择。'
  if (files[0].size > MAX_FILE_BYTES) return '文件超过 10 MiB，请选择更小的文件。'
  return null
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KiB`
  return `${bytes} B`
}

export function expiryLabel(minutes: number) {
  if (minutes < 60) return `${minutes} 分钟`
  if (minutes < 1440) return `${minutes / 60} 小时`
  return `${minutes / 1440} 天`
}

export function itemName(item: ShareItem) {
  return item.kind === 'file' ? item.file.name : '文本分享'
}
