import { Metadata } from 'next'
import { db } from '@/lib/db'
import { pastes } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { decrypt } from '@/lib/crypto'
import { PasteViewer } from '@/components/paste/paste-viewer'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  return {
    title: `Paste - ${id}`,
    description: 'View shared code paste',
  }
}

export default async function PastePage({ params }: PageProps) {
  const { id } = await params
  
  let paste
  try {
    const result = await db.select().from(pastes).where(eq(pastes.id, id)).limit(1)
    paste = result[0]
  } catch {
    return (
      <div className="relative min-h-screen bg-(--bg-base) overflow-hidden">
        <div className="retro-grid" />
        <main className="relative mx-auto flex min-h-screen max-w-225 flex-col items-center px-6 py-8">
          <div className="w-full max-w-175">
            <PasteViewer
              pasteId={id}
              initialStatus="not_found"
              hasPassword={false}
              language="plaintext"
              burnCount={null}
            />
          </div>
        </main>
      </div>
    )
  }
  
  let status: 'active' | 'not_found' | 'expired' | 'destroyed' = 'not_found'
  let initialContent: string | undefined
  
  if (paste) {
    if (paste.expiresAt && paste.expiresAt < new Date()) {
      status = 'expired'
    } else if (paste.burnCount !== null && paste.burnCount <= 0) {
      status = 'destroyed'
    } else {
      status = 'active'
      if (!paste.passwordHash && paste.encrypted && paste.iv) {
        try {
          initialContent = decrypt(paste.content, paste.iv)
        } catch {
          status = 'not_found'
        }
      } else if (!paste.passwordHash && !paste.encrypted) {
        initialContent = paste.content
      }
    }
  }
  
  return (
    <div className="relative min-h-screen bg-(--bg-base) overflow-hidden">
      <div className="retro-grid" />
      <main className="relative mx-auto flex min-h-screen max-w-225 flex-col items-center px-6 py-8">
        <div className="w-full max-w-175">
          <PasteViewer
            pasteId={id}
            initialStatus={status}
            hasPassword={!!paste?.passwordHash}
            language={paste?.language ?? 'plaintext'}
            burnCount={paste?.burnCount ?? null}
            initialContent={initialContent}
          />
        </div>
      </main>
    </div>
  )
}
