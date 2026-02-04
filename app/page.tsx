import { PasteCreator } from '@/components/paste/paste-creator'

export default function Home() {
  return (
    <div className="relative min-h-screen bg-[var(--bg-base)]">
      <div className="retro-grid" />
      <main className="relative mx-auto flex min-h-screen max-w-[900px] flex-col items-center justify-center px-6 py-12">
        <h1 className="text-4xl font-semibold tracking-tight text-[var(--text-primary)] mb-2">
          Paste Creator
        </h1>
        <p className="text-lg text-[var(--text-secondary)] mb-10">
          Share code instantly
        </p>
        <div className="w-full max-w-[700px]">
          <PasteCreator />
        </div>
      </main>
    </div>
  )
}
