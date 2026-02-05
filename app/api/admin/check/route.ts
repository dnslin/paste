import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/admin/session';
import { success } from '@/lib/api-response';

export async function GET() {
  const isAuthenticated = await verifySession();
  return NextResponse.json(success({ authenticated: isAuthenticated }));
}
