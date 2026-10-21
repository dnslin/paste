import type { RecordFilterValues } from '@/components/admin/record-filters'

export type RecordKind = 'text' | 'file'
export type RecordStatus = 'active' | 'expired' | 'destroyed' | 'exhausted' | 'pending_delete' | 'delete_failed'

export interface DemoRecord {
  id: string
  kind: RecordKind
  fileName?: string
  language?: string
  size?: number
  createdAt: string
  status: RecordStatus
  hasPassword: boolean
}

export const STATUS_LABELS: Record<RecordStatus, string> = {
  active: '可访问',
  expired: '已过期',
  destroyed: '查看次数用尽',
  exhausted: '下载次数用尽',
  pending_delete: '等待清理',
  delete_failed: '清理失败',
}

export const DEMO_RECORDS: DemoRecord[] = [
  { id: 'aB7kP2mQ', kind: 'text', language: 'TypeScript', createdAt: '2026-10-21T03:36:00Z', status: 'active', hasPassword: false },
  { id: 'rF4nD8wL', kind: 'text', language: 'JSON', createdAt: '2026-10-21T01:12:00Z', status: 'active', hasPassword: true },
  { id: 'mT6xH9cV', kind: 'text', language: 'SQL', createdAt: '2026-10-20T09:40:00Z', status: 'destroyed', hasPassword: false },
  { id: 'qJ3pA5sE', kind: 'text', language: 'Markdown', createdAt: '2026-10-20T07:25:00Z', status: 'active', hasPassword: false },
  { id: 'dN8vK2hR', kind: 'text', language: 'Python', createdAt: '2026-10-19T06:18:00Z', status: 'expired', hasPassword: true },
  { id: 'wC5yM7bU', kind: 'text', language: 'Shell', createdAt: '2026-10-18T08:04:00Z', status: 'active', hasPassword: false },
  { id: 'hL2rF6pX', kind: 'text', language: 'Go', createdAt: '2026-10-18T02:45:00Z', status: 'active', hasPassword: false },
  { id: 'sP9aD3tK', kind: 'text', language: 'YAML', createdAt: '2026-10-17T10:32:00Z', status: 'destroyed', hasPassword: true },
  { id: 'bV4mR8jN', kind: 'text', language: 'JavaScript', createdAt: '2026-10-17T03:15:00Z', status: 'active', hasPassword: false },
  { id: 'xE7kQ5nA', kind: 'text', language: 'CSS', createdAt: '2026-10-16T08:56:00Z', status: 'expired', hasPassword: false },
  { id: 'pU3cW9fD', kind: 'text', language: 'HTML', createdAt: '2026-10-15T05:44:00Z', status: 'active', hasPassword: false },
  { id: 'gH6sY2vM', kind: 'text', language: 'Java', createdAt: '2026-10-14T07:23:00Z', status: 'active', hasPassword: true },
  { id: 'kA8dT4qB', kind: 'text', language: 'Rust', createdAt: '2026-10-13T04:08:00Z', status: 'expired', hasPassword: false },
  { id: 'nR5wC7eL', kind: 'text', language: 'Dockerfile', createdAt: '2026-10-11T09:17:00Z', status: 'active', hasPassword: false },
  { id: 'vM2hP6zF', kind: 'text', language: 'Plain Text', createdAt: '2026-10-09T02:30:00Z', status: 'destroyed', hasPassword: false },
  { id: 'cD9bS3uJ', kind: 'text', language: 'JSON', createdAt: '2026-10-06T06:42:00Z', status: 'active', hasPassword: true },
  { id: 'tQ4xG8aW', kind: 'text', language: 'Nginx', createdAt: '2026-10-02T11:05:00Z', status: 'expired', hasPassword: false },
  { id: 'eK7nV5rH', kind: 'text', language: 'Markdown', createdAt: '2026-09-24T01:50:00Z', status: 'active', hasPassword: false },
  { id: 'fR8kP2nQ', kind: 'file', fileName: '交付说明_v3.pdf', size: 2483200, createdAt: '2026-10-21T03:28:00Z', status: 'active', hasPassword: true },
  { id: 'fB5mT9wL', kind: 'file', fileName: 'Paste_设计稿.fig', size: 8243200, createdAt: '2026-10-21T02:10:00Z', status: 'active', hasPassword: false },
  { id: 'fN3xH7cV', kind: 'file', fileName: '后台搜索与筛选功能交付文档_包含桌面手机布局和所有交互状态说明_产品评审与开发验收最终版本_2026-10-21.pdf', size: 3584000, createdAt: '2026-10-21T00:45:00Z', status: 'active', hasPassword: false },
  { id: 'fJ6pA4sE', kind: 'file', fileName: '交付清单_20261020.xlsx', size: 186368, createdAt: '2026-10-20T09:20:00Z', status: 'delete_failed', hasPassword: true },
  { id: 'fD2vK8hR', kind: 'file', fileName: 'API_README.md', size: 12480, createdAt: '2026-10-20T06:15:00Z', status: 'active', hasPassword: false },
  { id: 'fW7yM5bU', kind: 'file', fileName: '部署日志_2026-10-19.txt', size: 452608, createdAt: '2026-10-19T08:35:00Z', status: 'expired', hasPassword: false },
  { id: 'fH4rF2pX', kind: 'file', fileName: '演示截图.png', size: 1572864, createdAt: '2026-10-19T03:52:00Z', status: 'exhausted', hasPassword: false },
  { id: 'fS8aD6tK', kind: 'file', fileName: '交付说明_v2.pdf', size: 2170880, createdAt: '2026-10-18T10:05:00Z', status: 'pending_delete', hasPassword: true },
  { id: 'fV9mR3jN', kind: 'file', fileName: '测试数据_100%_完成.csv', size: 78232, createdAt: '2026-10-18T04:10:00Z', status: 'active', hasPassword: false },
  { id: 'fX2kQ7nA', kind: 'file', fileName: '品牌标志.svg', size: 4382, createdAt: '2026-10-17T07:44:00Z', status: 'active', hasPassword: false },
  { id: 'fP6cW4fD', kind: 'file', fileName: '回归测试报告.pdf', size: 1716224, createdAt: '2026-10-16T06:30:00Z', status: 'delete_failed', hasPassword: false },
  { id: 'fG3sY8vM', kind: 'file', fileName: '数据库结构.sql', size: 28672, createdAt: '2026-10-15T02:55:00Z', status: 'active', hasPassword: true },
  { id: 'fK5dT9qB', kind: 'file', fileName: 'Release_Notes.md', size: 9634, createdAt: '2026-10-14T10:12:00Z', status: 'active', hasPassword: false },
  { id: 'fA7wC2eL', kind: 'file', fileName: '会议纪要_1013.docx', size: 54912, createdAt: '2026-10-13T05:42:00Z', status: 'exhausted', hasPassword: false },
  { id: 'fM4hP8zF', kind: 'file', fileName: '移动端交互录屏.mp4', size: 9437184, createdAt: '2026-10-12T07:22:00Z', status: 'active', hasPassword: false },
  { id: 'fC2bS6uJ', kind: 'file', fileName: '交付说明_v1.pdf', size: 1933312, createdAt: '2026-10-10T04:16:00Z', status: 'expired', hasPassword: true },
  { id: 'fT8xG3aW', kind: 'file', fileName: '配置示例.yaml', size: 1648, createdAt: '2026-10-07T09:03:00Z', status: 'active', hasPassword: false },
  { id: 'fE5nV7rH', kind: 'file', fileName: '验收附件.zip', size: 5242880, createdAt: '2026-10-03T01:40:00Z', status: 'pending_delete', hasPassword: false },
  { id: 'fU9qB4dS', kind: 'file', fileName: '界面规范_202609.pdf', size: 2457600, createdAt: '2026-09-28T08:25:00Z', status: 'active', hasPassword: false },
  { id: 'fL3gN6kP', kind: 'file', fileName: '项目目录.txt', size: 3654, createdAt: '2026-09-24T02:20:00Z', status: 'active', hasPassword: false },
]

export function filterRecords(records: DemoRecord[], kind: RecordKind, filters: RecordFilterValues): DemoRecord[] {
  const query = filters.q.trim()
  const from = filters.from ? new Date(`${filters.from}T00:00:00+08:00`).getTime() : -Infinity
  const before = filters.to ? new Date(`${filters.to}T00:00:00+08:00`).getTime() + 24 * 60 * 60 * 1000 : Infinity

  return records.filter((item) => {
    if (item.kind !== kind || (filters.status && item.status !== filters.status)) return false
    if (query && !item.id.includes(query) && !(kind === 'file' && item.fileName?.toLowerCase().includes(query.toLowerCase()))) return false
    const createdAt = new Date(item.createdAt).getTime()
    return createdAt >= from && createdAt < before
  }).sort((a, b) => {
    const timeDifference = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    return timeDifference || (a.id === b.id ? 0 : a.id < b.id ? 1 : -1)
  })
}
