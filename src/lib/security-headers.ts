export type SecurityHeader = {
  key: string;
  value: string;
};

export type CspOptions = {
  isDev: boolean;
};

export const buildCsp = ({ isDev }: CspOptions): string => {
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
    "manifest-src 'self'",
  ];

  if (!isDev) {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
};

export type SecurityHeadersOptions = {
  isDev?: boolean;
};

export const getSecurityHeaders = (
  options: SecurityHeadersOptions = {}
): SecurityHeader[] => {
  const isDev = options.isDev ?? process.env.NODE_ENV !== "production";

  const headers: SecurityHeader[] = [
    { key: "Content-Security-Policy", value: buildCsp({ isDev }) },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-DNS-Prefetch-Control", value: "off" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=()",
    },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ];

  if (!isDev) {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=31536000; includeSubDomains",
    });
  }

  return headers;
};
