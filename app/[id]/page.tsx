import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { pastes } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { decryptPaste, getPasteStatus, type PasteStatus } from '@/lib/paste';
import { FileViewer } from '@/components/files/file-viewer';
import { PasteViewer } from '@/components/paste/paste-viewer';

export const dynamic = 'force-dynamic';
interface PageProps { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `Paste - ${id}`, description: '查看分享内容', referrer: 'no-referrer' };
}

export default async function PastePage({ params }: PageProps) {
  const { id } = await params;
  let status: PasteStatus | 'not_found' | 'error' = 'not_found';
  let paste;
  let initialContent: string | undefined;
  try {
    paste = db.select().from(pastes).where(eq(pastes.id, id)).get();
    if (paste) {
      status = getPasteStatus(paste);
      // A GET (including link previews/prefetches) never claims a limited view.
      if (paste.kind !== 'file' && status === 'active' && !paste.passwordHash && paste.burnCount === null) {
        initialContent = decryptPaste(paste);
      }
    }
  } catch (err) {
    console.error(`Render paste ${id} failed:`, err);
    status = 'error';
  }
  return (
    <div className="min-h-screen bg-(--bg-base)">
      <main className="mx-auto flex min-h-screen max-w-225 flex-col items-center px-6 py-8">
        <div className="w-full max-w-175">
          {paste?.kind === 'file' ? <FileViewer key={id} pasteId={id} initialStatus={status}
            hasPassword={!!paste.passwordHash} burnCount={paste.burnCount ?? 0} /> : <PasteViewer pasteId={id} initialStatus={status} hasPassword={!!paste?.passwordHash}
            language={paste?.language ?? 'plaintext'} burnCount={paste?.burnCount ?? null}
            initialContent={initialContent} />}
        </div>
      </main>
    </div>
  );
}
