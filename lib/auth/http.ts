import { NextResponse, type NextRequest } from "next/server";
import { authSiteOrigin } from "@/lib/auth/config";
import { safeRelativeReturnPath, supabaseCallbackPath } from "@/lib/auth-paths";
import { clientAddress, consumeRateLimit } from "@/lib/rate-limit";

const PASSWORD_WINDOW_MS = 15 * 60 * 1_000;
const EMAIL_WINDOW_MS = 60 * 60 * 1_000;

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

export async function enforceAuthRateLimit(request: NextRequest, subject: string, action: "password" | "email") {
  const emailAction = action === "email";
  const windowMs = emailAction ? EMAIL_WINDOW_MS : PASSWORD_WINDOW_MS;
  const addressLimitValue = emailAction ? 10 : 20;
  const subjectLimitValue = emailAction ? 3 : 5;
  const [addressLimit, subjectLimit] = await Promise.all([
    consumeRateLimit(`auth-${action}-address`, clientAddress(request), addressLimitValue, windowMs),
    consumeRateLimit(`auth-${action}-subject`, subject, subjectLimitValue, windowMs),
  ]);
  const limited = !addressLimit.allowed ? addressLimit : !subjectLimit.allowed ? subjectLimit : null;
  return limited ? limited.retryAfterSeconds : null;
}

export function authRequestAllowed(request: NextRequest) {
  const type = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() ?? "";
  return type === "application/x-www-form-urlencoded";
}
