import type { NextRequest } from "next/server";
import { isSupabaseAuthConfigured } from "@/lib/auth/config";
import { authCallbackUrl, authErrorPath, authRedirect, authRequestAllowed } from "@/lib/auth/http";
import { createSupabaseRouteClient } from "@/lib/auth/supabase-server";
import { safeRelativeReturnPath } from "@/lib/auth-paths";
import { isTrustedMutationRequest } from "@/lib/request-security";

export async function POST(request: NextRequest) {
  if (!isTrustedMutationRequest(request) || !authRequestAllowed(request)) return authRedirect(request, authErrorPath("/login", "blocked"));
  const form = await request.formData();
  const returnTo = safeRelativeReturnPath(typeof form.get("returnTo") === "string" ? String(form.get("returnTo")) : undefined);
  if (!isSupabaseAuthConfigured()) return authRedirect(request, authErrorPath("/login", "unavailable", returnTo));

  try {
    const { client, applyCookies } = createSupabaseRouteClient(request);
    const { data, error } = await client.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: authCallbackUrl(request, returnTo),
        queryParams: { prompt: "select_account" },
      },
    });
    if (error || !data.url) return authRedirect(request, authErrorPath("/login", "oauth_unavailable", returnTo));
    return applyCookies(authRedirect(request, data.url, 303));
  } catch (error) {
    console.error(JSON.stringify({ event: "google_auth_failed", message: error instanceof Error ? error.message : "Unexpected error", timestamp: new Date().toISOString() }));
    return authRedirect(request, authErrorPath("/login", "oauth_unavailable", returnTo));
  }
}
