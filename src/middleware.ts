import { NextResponse } from "next/server";

export const config = {
  matcher: ["/share/:path*"],
};

export function middleware() {
  const response = NextResponse.next();
  response.headers.set("X-Robots-Tag", "noindex, noarchive");
  return response;
}
