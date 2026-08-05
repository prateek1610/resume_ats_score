import type { NextRequest } from "next/server";
import { isSupabaseAuthConfigured } from "@/lib/auth/config";
import { authCallbackUrl, authErrorPath, authRedirect, authRequestAllowed, enforceAuthRateLimit } from "@/lib/auth/http";
import { emailLinkSchema, formValues } from "@/lib/auth/inputs";
import { createSupabaseRouteClient } from "@/lib/auth/supabase-server";
import { safeRelativeReturnPath } from "@/lib/auth-paths";
import { isTrustedMutationRequest } from "@/lib/request-security";

export async function POST(request: NextRequest) {
  if (!isTrustedMutationRequest(request) || !authRequestAllowed(request)) return authRedirect(request, authErrorPath("/login", "blocked"));
  const values = formValues(await request.formData());
  const parsed = emailLinkSchema.safeParse(values);
  const returnTo = safeRelativeReturnPath(values.returnTo);
  const page = values.intent === "signup" ? "/signup" as const : "/login" as const;
  if (!parsed.success) return authRedirect(request, authErrorPath(page, "invalid_email", returnTo));
  if (!isSupabaseAuthConfigured()) return authRedirect(request, authErrorPath(page, "unavailable", returnTo));

  try {
    const retryAfter = await enforceAuthRateLimit(request, parsed.data.email);
    if (retryAfter) return authRedirect(request, authErrorPath(page, "rate_limited", returnTo));

    const { client } = createSupabaseRouteClient(request);
    const { error } = await client.auth.signInWithOtp({
      email: parsed.data.email,
      options: {
        emailRedirectTo: authCallbackUrl(request, returnTo),
        shouldCreateUser: parsed.data.intent === "signup",
      },
    });
    if (error && ["over_email_send_rate_limit", "over_request_rate_limit"].includes(error.code ?? "")) {
      return authRedirect(request, authErrorPath(page, "rate_limited", returnTo));
    }

    // The same response is used for unknown and known emails to prevent account enumeration.
    return authRedirect(request, `/auth/check-email?purpose=magic-link&return_to=${encodeURIComponent(returnTo)}`);
  } catch (error) {
    console.error(JSON.stringify({ event: "magic_link_auth_failed", message: error instanceof Error ? error.message : "Unexpected error", timestamp: new Date().toISOString() }));
    return authRedirect(request, authErrorPath(page, "unavailable", returnTo));
  }
}
