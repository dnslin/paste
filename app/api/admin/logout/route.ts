import { NextResponse } from 'next/server';
import { deleteSession } from '@/lib/admin/session';
import { success } from '@/lib/api-response';

export async function POST() {
  await deleteSession();
  return NextResponse.json(success({ message: 'Logged out' }));
}
