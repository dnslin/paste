import type { Metadata } from 'next'
import { CreatorRevokePrototype } from '@/components/creator-revoke-prototype/creator-revoke-prototype'

export const metadata: Metadata = {
  title: '创建者主动撤销原型 · Paste',
  description: '文本和文件分享的私人管理链接与主动撤销交互原型',
  robots: { index: false, follow: false },
}

export default function CreatorRevokePrototypePage() {
  return <CreatorRevokePrototype />
}
