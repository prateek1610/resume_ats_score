import type { NextRequest } from "next/server";
import { isSupabaseAuthConfigured } from "@/lib/auth/config";
import { authErrorPath, authRedirect, authRequestAllowed } from "@/lib/auth/http";
import { formValues, updatePasswordSchema } from "@/lib/auth/inputs";
import { createSupabaseRouteClient } from "@/lib/auth/supabase-server";
import { resumeLensLoginPath, safeRelativeReturnPath } from "@/lib/auth-paths";
import { isTrustedMutationRequest } from "@/lib/request-security";
import { errorType, securityLog } from "@/lib/security-log";

export async function POST(request: NextRequest) {
  if (!isTrustedMutationRequest(request) || !authRequestAllowed(request)) return authRedirect(request, authErrorPath("/auth/update-password", "blocked"));
  const values = formValues(await request.formData());
  const parsed = updatePasswordSchema.safeParse(values);
  const returnTo = safeRelativeReturnPath(values.returnTo);
  if (!parsed.success) return authRedirect(request, authErrorPath("/auth/update-password", "invalid_password", returnTo));
  if (!isSupabaseAuthConfigured()) return authRedirect(request, authErrorPath("/auth/update-password", "unavailable", returnTo));

  try {
    const { client, applyCookies } = createSupabaseRouteClient(request);
    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError || !userData.user) return authRedirect(request, authErrorPath("/login", "recovery_expired", returnTo));
    const { error } = await client.auth.updateUser({ password: parsed.data.password });
    if (error) return authRedirect(request, authErrorPath("/auth/update-password", "invalid_password", returnTo));
    await client.auth.signOut({ scope: "global" });
    return applyCookies(authRedirect(request, `${resumeLensLoginPath(returnTo)}&success=password_updated`));
  } catch (error) {
    securityLog("error", "password_update_failed", undefined, { errorType: errorType(error) });
    return authRedirect(request, authErrorPath("/auth/update-password", "unavailable", returnTo));
  }
}
