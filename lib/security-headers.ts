const IS_DEVELOPMENT = process.env.NODE_ENV === "development";

export function contentSecurityPolicy(nonce?: string) {
  const scriptSource = nonce
    ? `'self' 'nonce-${nonce}' 'strict-dynamic'${IS_DEVELOPMENT ? " 'unsafe-eval'" : ""}`
    : "'self'";

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "frame-src 'none'",
    "media-src 'none'",
    "manifest-src 'self'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    // React uses style attributes for progress indicators. Inline scripts remain
    // blocked and all framework scripts require the per-request nonce.
    "style-src 'self' 'unsafe-inline'",
    `script-src ${scriptSource}`,
    "connect-src 'self'",
    "worker-src 'self' blob:",
  ].join("; ");
}

export const BASE_SECURITY_HEADERS = {
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-Permitted-Cross-Domain-Policies": "none",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Origin-Agent-Cluster": "?1",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
} as const;

export function applySecurityHeaders(headers: Headers, nonce?: string) {
  if (!headers.has("Content-Security-Policy")) {
    headers.set("Content-Security-Policy", contentSecurityPolicy(nonce));
  }
  for (const [name, value] of Object.entries(BASE_SECURITY_HEADERS)) {
    if (!headers.has(name)) headers.set(name, value);
  }
}
