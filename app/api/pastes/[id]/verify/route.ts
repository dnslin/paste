import { NextRequest, NextResponse } from 'next/server';
import { ApiError, success, error, NOT_FOUND, VALIDATION_ERROR, RATE_LIMITED, INTERNAL_ERROR } from '@/lib/api-response';
import { readPaste } from '@/lib/paste';
import { getPasswordError } from '@/lib/paste-rules';
import { getClientIp } from '@/lib/request-client';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(error(VALIDATION_ERROR, '请求不是有效的 JSON'), { status: 400 });
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return NextResponse.json(error(VALIDATION_ERROR, '请求内容必须是对象'), { status: 400 });
  }
  const { password } = body as Record<string, unknown>;
  if (password !== undefined && typeof password !== 'string') {
    return NextResponse.json(error(VALIDATION_ERROR, '密码必须是字符串'), { status: 400 });
  }
  const passwordError = typeof password === 'string' ? getPasswordError(password) : null;
  if (passwordError) return NextResponse.json(error(VALIDATION_ERROR, passwordError), { status: 400 });

  try {
    return NextResponse.json(success(await readPaste(id, password, getClientIp(request))), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    if (err instanceof ApiError) {
      const status = err.code === NOT_FOUND ? 404 : err.code === RATE_LIMITED ? 429 : 400;
      return NextResponse.json(error(err.code, err.message), { status });
    }
    console.error(`Read paste ${id} failed:`, err);
    return NextResponse.json(error(INTERNAL_ERROR, '读取失败，请稍后重试'), { status: 500 });
  }
}
