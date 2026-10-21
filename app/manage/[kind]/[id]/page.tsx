import type { Metadata } from 'next'
import { ShareManagement } from '@/components/share-management/share-management'

export const metadata: Metadata = {
  title: '管理分享 · Paste',
  description: '通过私人管理链接撤销分享',
  robots: { index: false, follow: false },
}

export default async function ShareManagementPage({ params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params
  return <ShareManagement kind={kind === 'text' || kind === 'file' ? kind : null} shareId={id} />
}
