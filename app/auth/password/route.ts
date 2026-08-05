import type { NextRequest } from "next/server";
import { isSupabaseAuthConfigured } from "@/lib/auth/config";
import { authErrorPath, authRedirect, authRequestAllowed, authCallbackUrl, enforceAuthRateLimit } from "@/lib/auth/http";
import { formValues, passwordLoginSchema, passwordSignupSchema } from "@/lib/auth/inputs";
import { createSupabaseRouteClient } from "@/lib/auth/supabase-server";
import { safeRelativeReturnPath } from "@/lib/auth-paths";
import { isTrustedMutationRequest } from "@/lib/request-security";

export async function POST(request: NextRequest) {
  const intent = request.nextUrl.searchParams.get("intent") === "signup" ? "signup" : "login";
  const page = intent === "signup" ? "/signup" as const : "/login" as const;
  if (!isTrustedMutationRequest(request) || !authRequestAllowed(request)) return authRedirect(request, authErrorPath(page, "blocked"));
  if (!isSupabaseAuthConfigured()) return authRedirect(request, authErrorPath(page, "unavailable"));

  const values = formValues(await request.formData());
  const parsed = intent === "signup" ? passwordSignupSchema.safeParse(values) : passwordLoginSchema.safeParse(values);
  const returnTo = safeRelativeReturnPath(values.returnTo);
  if (!parsed.success) return authRedirect(request, authErrorPath(page, "invalid_input", returnTo));

  try {
    const retryAfter = await enforceAuthRateLimit(request, parsed.data.email);
    if (retryAfter) return authRedirect(request, authErrorPath(page, "rate_limited", returnTo));

    const { client, applyCookies } = createSupabaseRouteClient(request);
    if (intent === "signup") {
      const signup = passwordSignupSchema.parse(values);
      const { data, error } = await client.auth.signUp({
        email: signup.email,
        password: signup.password,
        options: {
          emailRedirectTo: authCallbackUrl(request, returnTo),
          data: { full_name: signup.fullName },
        },
      });
      if (error) return authRedirect(request, authErrorPath(page, authErrorCode(error.code), returnTo));
      if (!data.session) return authRedirect(request, `/auth/check-email?purpose=signup&return_to=${encodeURIComponent(returnTo)}`);
      return applyCookies(authRedirect(request, returnTo));
    }

    const login = passwordLoginSchema.parse(values);
    const { error } = await client.auth.signInWithPassword({ email: login.email, password: login.password });
    if (error) return authRedirect(request, authErrorPath(page, authErrorCode(error.code), returnTo));
    return applyCookies(authRedirect(request, returnTo));
  } catch (error) {
    console.error(JSON.stringify({ event: "password_auth_failed", message: error instanceof Error ? error.message : "Unexpected error", timestamp: new Date().toISOString() }));
    return authRedirect(request, authErrorPath(page, "unavailable", returnTo));
  }
}

function authErrorCode(code?: string) {
  if (code === "email_not_confirmed") return "email_not_confirmed";
  if (code === "over_email_send_rate_limit" || code === "over_request_rate_limit") return "rate_limited";
  if (code === "invalid_credentials") return "invalid_credentials";
  return "unavailable";
}
