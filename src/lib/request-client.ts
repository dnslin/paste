import type { NextRequest } from 'next/server';

// Only enable this behind an ingress that overwrites X-Real-IP and hides the app port.
export function getClientIp(request: NextRequest): string {
  if (process.env.TRUST_PROXY === 'true') {
    return request.headers.get('x-real-ip') || 'direct';
  }
  // NextRequest has no socket address. Direct installations share a bucket;
  // client-supplied forwarding headers must not create new identities.
  return 'direct';
}

export function getPublicOrigin(request: NextRequest): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return new URL(process.env.NEXT_PUBLIC_BASE_URL).origin;
  }
  const url = new URL(request.url);
  const requestHost = request.headers.get('host') || url.host;
  if (process.env.TRUST_PROXY === 'true') {
    const forwardedProtocol = request.headers.get('x-forwarded-proto');
    const protocol = forwardedProtocol === 'http' || forwardedProtocol === 'https'
      ? forwardedProtocol : url.protocol.slice(0, -1);
    const host = request.headers.get('x-forwarded-host') || requestHost;
    return new URL(`${protocol}://${host}`).origin;
  }
  return new URL(`${url.protocol}//${requestHost}`).origin;
}
