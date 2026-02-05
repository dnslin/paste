import { PasteCreator } from '@/components/paste/paste-creator'

export default function Home() {
  return (
    <div className="relative min-h-screen bg-(--bg-base) overflow-hidden">
      <div className="retro-grid" />
      <main className="relative mx-auto flex h-screen max-w-225 flex-col items-center px-6 py-8">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-semibold tracking-tight text-(--text-primary) mb-2">
            Paste Creator
          </h1>
          <p className="text-lg text-(--text-secondary)">
            Share code instantly
          </p>
        </div>
        <div className="w-full max-w-175 flex-1 min-h-0">
          <PasteCreator />
        </div>
      </main>
    </div>
  )
}
