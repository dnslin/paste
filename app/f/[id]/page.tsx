import type { Metadata } from 'next'
import { FileReceiver } from '@/components/file-share/file-receiver'
import { getFileShareMetadata } from '@/lib/file-share'
import type { FileShareMetadata } from '@/lib/file-share-contract'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: '文件分享 · Paste', robots: { index: false, follow: false } }

export default async function FileSharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let file: FileShareMetadata | null = null
  let failed = false
  try { file = getFileShareMetadata(id) } catch (error) { console.error(`Read file share ${id} failed:`, error); failed = true }

  return <div className="min-h-screen bg-(--bg-base)">
    <main className="mx-auto flex min-h-screen max-w-225 flex-col items-center px-6 py-8"><div className="w-full max-w-175"><FileReceiver key={id} initialMetadata={file} initialError={failed} /></div></main>
  </div>
}
