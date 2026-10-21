import type { Metadata } from 'next'
import { QrSharingPrototype } from '@/components/qr-sharing-prototype/qr-sharing-prototype'

export const metadata: Metadata = {
  title: '二维码分享原型 · Paste',
  description: '文本与文件分享结果中的二维码交互原型',
  robots: { index: false, follow: false },
}

export default function QrSharingPrototypePage() {
  return <QrSharingPrototype />
}
