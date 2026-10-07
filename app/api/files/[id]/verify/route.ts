import { NextRequest } from 'next/server';
import { success } from '@/lib/api-response';
import { verifyFile } from '@/lib/files';
import { getClientIp } from '@/lib/request-client';
import { fileJson, fileError, readFileJson, requireSameOrigin, requestDeadline, requireFileReadRate } from '@/lib/file-http';
import { PAYLOAD_TIMEOUT_MS } from '@/lib/file-config';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const deadline = requestDeadline(request, PAYLOAD_TIMEOUT_MS);
  try {
    requireSameOrigin(request);
    requireFileReadRate(request);
    const { id } = await params;
    const { password } = await readFileJson(request, deadline.signal);
    const metadata = await verifyFile(id, password, getClientIp(request));
    deadline.signal.throwIfAborted();
    return fileJson(success(metadata));
  } catch (err) { return fileError(err); }
  finally { deadline.clear(); }
}
