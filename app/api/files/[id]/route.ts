import { NextRequest, NextResponse } from 'next/server';
import { ApiError, NOT_FOUND, success } from '@/lib/api-response';
import { getFileShareMetadata } from '@/lib/file-share';
import { fileErrorResponse } from '@/lib/file-http';

export const runtime = 'nodejs';
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const metadata = getFileShareMetadata(id);
    if (!metadata) throw new ApiError(NOT_FOUND, '文件分享不存在');
    return NextResponse.json(success(metadata), { headers: { 'Cache-Control': 'no-store' } });
  } catch (cause) { return fileErrorResponse(cause, `Get file metadata ${id}`); }
}
