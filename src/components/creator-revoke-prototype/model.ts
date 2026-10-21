export type ShareKind = 'text' | 'file'
export type PrototypeScreen = 'created' | 'manage' | 'receive'
export type Scenario = 'current' | 'expired' | 'exhausted' | 'invalid' | 'load-error'

export const examples = {
  text: { name: 'JavaScript', id: 'p7Kx4mNq', limit: '剩余 3 次查看机会', action: '查看内容', noun: '文本' },
  file: { name: '项目交付说明与接口文档.zip', id: 'f8Wy2rLc', limit: '剩余 3 次下载机会', action: '下载文件', noun: '文件' },
} as const

export function demoPath(kind: ShareKind, screen: PrototypeScreen) {
  return `/prototype/creator-revoke#${kind}/${screen}`
}

export function displayUrl(kind: ShareKind, management = false) {
  const collection = kind
  const path = management ? `/manage/${collection}/${examples[kind].id}#demo-private-key` : `${kind === 'file' ? '/f' : ''}/${examples[kind].id}`
  return `https://paste.example${path}`
}
