import type { Metadata } from 'next'
import { TextDownloadPrototype } from '@/components/text-download-prototype/text-download-prototype'

export const metadata: Metadata = {
  title: '下载文本原文原型 · Paste',
  description: '从已领取正文保存 JSON、SQL 和配置的交互原型',
  robots: { index: false, follow: false },
}

export default function TextDownloadPrototypePage() {
  return <TextDownloadPrototype />
}
