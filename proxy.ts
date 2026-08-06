import type { NextRequest } from "next/server";
import { refreshAuthSession } from "@/lib/auth/proxy";
import { applySecurityHeaders, contentSecurityPolicy } from "@/lib/security-headers";

export async function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const requestHeaders = new Headers(request.headers);
  const policy = contentSecurityPolicy(nonce);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", policy);

  const response = await refreshAuthSession(request, requestHeaders);
  response.headers.set("content-security-policy", policy);
  applySecurityHeaders(response.headers, nonce);

  if (/^\/(?:api|auth|dashboard|reports|login|signup|forgot-password)(?:\/|$)/.test(request.nextUrl.pathname)) {
    response.headers.set("cache-control", "private, no-store, max-age=0");
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
