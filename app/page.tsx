import { ShareCreator } from '@/components/files/share-creator'
import { verifySession } from '@/lib/admin/session'
import { Logo } from '@/components/logo'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const allowFiles = await verifySession()
  return (
    <div className="relative min-h-screen bg-(--bg-base)">
      <div className="retro-grid" />
      <main className="relative mx-auto flex min-h-screen max-w-225 flex-col items-center px-6 py-8">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Logo />
            <h1 className="text-4xl font-semibold tracking-tight text-(--text-primary)">
              创建分享
            </h1>
          </div>
          <p className="text-lg text-(--text-secondary)">
            {allowFiles ? '快速分享代码、文本与文件' : '快速分享代码与文本'}
          </p>
        </div>
        <div className="w-full max-w-175 flex-1 min-h-0">
          <ShareCreator allowFiles={allowFiles} />
        </div>
      </main>
    </div>
  )
}
