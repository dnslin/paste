import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/admin/session';

const SESSION_COOKIE_NAME = 'admin_session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  
  const isAuthenticated = token ? (await decrypt(token))?.isAdmin === true : false;
  const isLoginPage = pathname === '/admin/login';

  if (isLoginPage) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    return NextResponse.next();
  }

  if (!isAuthenticated) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
