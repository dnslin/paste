import { NextRequest } from 'next/server';
import { success, ApiError, VALIDATION_ERROR } from '@/lib/api-response';
import { claimFile } from '@/lib/files';
import { getClientIp } from '@/lib/request-client';
import { fileJson, fileError, readFileJson, requireSameOrigin, requestDeadline } from '@/lib/file-http';
import { PAYLOAD_TIMEOUT_MS } from '@/lib/file-config';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const deadline = requestDeadline(request, PAYLOAD_TIMEOUT_MS);
  try {
    requireSameOrigin(request);
    const { id } = await params;
    const { password, claimKey } = await readFileJson(request, deadline.signal);
    if (typeof claimKey !== 'string') throw new ApiError(VALIDATION_ERROR, '请提供下载凭证');
    return fileJson(success(await claimFile(id, claimKey, password, getClientIp(request), deadline.signal)));
  } catch (err) { return fileError(err); }
  finally { deadline.clear(); }
}
