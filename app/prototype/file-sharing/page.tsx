import type { Metadata } from 'next'
import { FileSharingPrototype } from '@/components/file-sharing-prototype/file-sharing-prototype'

export const metadata: Metadata = {
  title: '文件分享原型 · Paste',
  description: '基于现有 Paste 界面的文件分享交互原型',
  robots: { index: false, follow: false },
}

export default function FileSharingPrototypePage() {
  return <FileSharingPrototype />
}
