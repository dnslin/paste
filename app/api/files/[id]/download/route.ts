import { NextRequest } from 'next/server';
import { error, UNAUTHORIZED } from '@/lib/api-response';
import { authorizeDownload } from '@/lib/files';
import { acquirePayloadSlot, readFilePayload } from '@/lib/file-storage';
import { contentDisposition } from '@/lib/file-upload';
import { PAYLOAD_TIMEOUT_MS } from '@/lib/file-config';
import { FILE_HEADERS, fileJson, fileError, requireSameOrigin, requestDeadline, requireFileReadRate } from '@/lib/file-http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function HEAD() {
  return new Response(null, { status: 405, headers: { ...FILE_HEADERS, Allow: 'GET' } });
}
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const deadline = requestDeadline(request, PAYLOAD_TIMEOUT_MS);
  let release: (() => void) | undefined;
  let handedOff = false;
  try {
    requireSameOrigin(request);
    const { id } = await params;
    const authorization = request.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) return fileJson(error(UNAUTHORIZED, '请先领取下载凭证'), 401);
    const key = authorization.slice(7);
    const initial = authorizeDownload(id, key);
    requireFileReadRate(request);
    release = acquirePayloadSlot();
    let bytes: Buffer | null = await readFilePayload(id, initial.file, deadline.signal);
    deadline.signal.throwIfAborted();
    // Recheck after I/O/authentication, immediately before allowing the response.
    const { file } = authorizeDownload(id, key);
    let offset = 0, closed = false;
    let streamController: ReadableStreamDefaultController<Uint8Array>;
    const finish = () => {
      if (closed) return;
      closed = true; bytes = null; deadline.clear(); release?.();
      deadline.signal.removeEventListener('abort', abort);
    };
    const abort = () => { streamController.error(new Error('Download interrupted')); finish(); };
    const body = new ReadableStream<Uint8Array>({
      start(controller) { streamController = controller; },
      pull(controller) {
        if (closed || !bytes) return;
        if (deadline.signal.aborted) { abort(); return; }
        // Next requests the next chunk after the previous socket write drains.
        // Keep the slot/deadline alive until that final drain, not final enqueue.
        if (offset >= bytes.length) { controller.close(); finish(); return; }
        const end = Math.min(offset + 64 * 1024, bytes.length);
        // Do not let a blocked transport retain the entire 10 MiB backing buffer.
        controller.enqueue(Uint8Array.from(bytes.subarray(offset, end)));
        offset = end;
      },
      cancel() { finish(); },
    }, { highWaterMark: 0 });
    deadline.signal.addEventListener('abort', abort, { once: true });
    handedOff = true;
    return new Response(body, { headers: { ...FILE_HEADERS, 'Content-Type': 'application/octet-stream',
      'Content-Disposition': contentDisposition(file.fileName), 'Content-Length': String(file.size), 'Accept-Ranges': 'none' } });
  } catch (err) { return fileError(err); }
  finally { if (!handedOff) { release?.(); deadline.clear(); } }
}
