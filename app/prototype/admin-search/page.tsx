import type { Metadata } from 'next'
import { AdminSearchPrototype } from '@/components/admin-search-prototype/admin-search-prototype'

export const metadata: Metadata = {
  title: '后台搜索与筛选原型 · Paste',
  robots: { index: false, follow: false },
}

export default function AdminSearchPrototypePage() {
  return <AdminSearchPrototype />
}
