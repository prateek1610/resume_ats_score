import { NextResponse, type NextRequest } from "next/server";
import { authSiteOrigin } from "@/lib/auth/config";
import { safeRelativeReturnPath, supabaseCallbackPath } from "@/lib/auth-paths";
import { clientAddress, consumeRateLimit } from "@/lib/rate-limit";

const AUTH_WINDOW_MS = 10 * 60 * 1_000;

export function authRedirect(request: NextRequest, path: string, status = 303) {
  const response = NextResponse.redirect(new URL(path, authSiteOrigin(request.url)), status);
  response.headers.set("cache-control", "no-store");
  response.headers.set("referrer-policy", "no-referrer");
  return response;
}

export function authErrorPath(page: "/login" | "/signup" | "/forgot-password" | "/auth/update-password", code: string, returnTo?: string) {
  const params = new URLSearchParams({ error: code });
  if (returnTo) params.set("return_to", safeRelativeReturnPath(returnTo));
  return `${page}?${params.toString()}`;
}

export function authCallbackUrl(request: NextRequest, returnTo: string, recovery = false) {
  const url = new URL(supabaseCallbackPath(returnTo), authSiteOrigin(request.url));
  if (recovery) url.searchParams.set("recovery", "1");
  return url.toString();
}

export async function enforceAuthRateLimit(request: NextRequest, subject: string) {
  const [addressLimit, subjectLimit] = await Promise.all([
    consumeRateLimit("auth-address", clientAddress(request), 30, AUTH_WINDOW_MS),
    consumeRateLimit("auth-subject", subject, 8, AUTH_WINDOW_MS),
  ]);
  const limited = !addressLimit.allowed ? addressLimit : !subjectLimit.allowed ? subjectLimit : null;
  return limited ? limited.retryAfterSeconds : null;
}

export function authRequestAllowed(request: NextRequest) {
  const type = request.headers.get("content-type")?.toLowerCase() ?? "";
  return type.startsWith("application/x-www-form-urlencoded") || type.startsWith("multipart/form-data");
}
