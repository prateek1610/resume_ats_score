import type { NextRequest } from "next/server";
import { isSupabaseAuthConfigured } from "@/lib/auth/config";
import { authErrorPath, authRedirect } from "@/lib/auth/http";
import { createSupabaseRouteClient } from "@/lib/auth/supabase-server";
import { safeRelativeReturnPath } from "@/lib/auth-paths";

export async function GET(request: NextRequest) {
  const returnTo = safeRelativeReturnPath(request.nextUrl.searchParams.get("return_to"));
  const code = request.nextUrl.searchParams.get("code");
  if (!isSupabaseAuthConfigured() || !code || request.nextUrl.searchParams.has("error")) {
    return authRedirect(request, authErrorPath("/login", "callback_failed", returnTo), 302);
  }

  try {
    const { client, applyCookies } = createSupabaseRouteClient(request);
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (error) return authRedirect(request, authErrorPath("/login", "callback_failed", returnTo), 302);
    const destination = request.nextUrl.searchParams.get("recovery") === "1"
      ? `/auth/update-password?return_to=${encodeURIComponent(returnTo)}`
      : returnTo;
    return applyCookies(authRedirect(request, destination, 302));
  } catch (error) {
    console.error(JSON.stringify({ event: "auth_callback_failed", message: error instanceof Error ? error.message : "Unexpected error", timestamp: new Date().toISOString() }));
    return authRedirect(request, authErrorPath("/login", "callback_failed", returnTo), 302);
  }
}
