import type { NextRequest } from "next/server";
import { isSupabaseAuthConfigured } from "@/lib/auth/config";
import { authCallbackUrl, authErrorPath, authRedirect, authRequestAllowed, enforceAuthRateLimit } from "@/lib/auth/http";
import { formValues, recoverySchema } from "@/lib/auth/inputs";
import { createSupabaseRouteClient } from "@/lib/auth/supabase-server";
import { safeRelativeReturnPath } from "@/lib/auth-paths";
import { isTrustedMutationRequest } from "@/lib/request-security";

export async function POST(request: NextRequest) {
  if (!isTrustedMutationRequest(request) || !authRequestAllowed(request)) return authRedirect(request, authErrorPath("/forgot-password", "blocked"));
  const values = formValues(await request.formData());
  const parsed = recoverySchema.safeParse(values);
  const returnTo = safeRelativeReturnPath(values.returnTo);
  if (!parsed.success) return authRedirect(request, authErrorPath("/forgot-password", "invalid_email", returnTo));
  if (!isSupabaseAuthConfigured()) return authRedirect(request, authErrorPath("/forgot-password", "unavailable", returnTo));

  try {
    const retryAfter = await enforceAuthRateLimit(request, parsed.data.email);
    if (retryAfter) return authRedirect(request, authErrorPath("/forgot-password", "rate_limited", returnTo));
    const { client } = createSupabaseRouteClient(request);
    await client.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: authCallbackUrl(request, returnTo, true),
    });
    return authRedirect(request, `/auth/check-email?purpose=recovery&return_to=${encodeURIComponent(returnTo)}`);
  } catch (error) {
    console.error(JSON.stringify({ event: "password_recovery_failed", message: error instanceof Error ? error.message : "Unexpected error", timestamp: new Date().toISOString() }));
    return authRedirect(request, authErrorPath("/forgot-password", "unavailable", returnTo));
  }
}
