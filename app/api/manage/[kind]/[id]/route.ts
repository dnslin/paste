import { NextRequest, NextResponse } from 'next/server';
import { ApiError, error, INTERNAL_ERROR, success } from '@/lib/api-response';
import { getManagedShare, MANAGEMENT_UNAVAILABLE, revokeManagedShare } from '@/lib/share-management';
import type { ShareKind } from '@/lib/share-management-contract';

export const runtime = 'nodejs';
interface RouteContext { params: Promise<{ kind: string; id: string }> }
const headers = { 'Cache-Control': 'no-store' };

async function credentials(request: NextRequest, context: RouteContext): Promise<{ kind: ShareKind; id: string; token: string }> {
  const { kind, id } = await context.params;
  const authorization = /^Bearer (.+)$/i.exec(request.headers.get('authorization') ?? '');
  if ((kind !== 'text' && kind !== 'file') || !authorization) {
    throw new ApiError(MANAGEMENT_UNAVAILABLE, '管理链接无效或分享已失效');
  }
  return { kind, id, token: authorization[1] };
}

function failure(cause: unknown, operation: string) {
  if (cause instanceof ApiError && cause.code === MANAGEMENT_UNAVAILABLE) {
    return NextResponse.json(error(cause.code, cause.message), { status: 404, headers });
  }
  console.error(`${operation} failed:`, cause);
  return NextResponse.json(error(INTERNAL_ERROR, '服务发生错误，请稍后重试'), { status: 500, headers });
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { kind, id, token } = await credentials(request, context);
    return NextResponse.json(success(getManagedShare(kind, id, token)), { headers });
  } catch (cause) { return failure(cause, 'Read share management'); }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { kind, id, token } = await credentials(request, context);
    return NextResponse.json(success(await revokeManagedShare(kind, id, token)), { headers });
  } catch (cause) { return failure(cause, 'Revoke share'); }
}
