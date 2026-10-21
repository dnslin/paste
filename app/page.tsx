import { ShareCreator } from '@/components/share-creator'
import { Logo } from '@/components/logo'

export default function Home() {
  return (
    <div className="relative min-h-screen bg-(--bg-base)">
      <div className="retro-grid" />
      <main className="relative mx-auto flex min-h-screen max-w-225 flex-col items-center px-6 py-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3">
            <Logo />
            <h1 className="text-4xl font-semibold tracking-tight text-(--text-primary)">
              Paste
            </h1>
          </div>
          <p className="mt-3 text-sm text-(--text-secondary)">分享文本、代码和文件</p>
        </div>
        <div className="w-full max-w-175 flex-1 min-h-0">
          <ShareCreator />
        </div>
      </main>
    </div>
  )
}
