import type { NextRequest } from "next/server";
import { isSupabaseAuthConfigured } from "@/lib/auth/config";
import { authRedirect } from "@/lib/auth/http";
import { createSupabaseRouteClient } from "@/lib/auth/supabase-server";
import { chatGPTSignOutPath, safeRelativeReturnPath } from "@/lib/auth-paths";
import { authRequestAllowed } from "@/lib/auth/http";
import { isTrustedMutationRequest } from "@/lib/request-security";

export async function POST(request: NextRequest) {
  if (!isTrustedMutationRequest(request) || !authRequestAllowed(request)) {
    return new Response(null, { status: 403, headers: { "cache-control": "no-store" } });
  }
  const form = await request.formData();
  const returnTo = safeRelativeReturnPath(typeof form.get("returnTo") === "string" ? String(form.get("returnTo")) : null, "/");
  if (!isSupabaseAuthConfigured()) return authRedirect(request, chatGPTSignOutPath(returnTo), 302);

  try {
    const { client, applyCookies } = createSupabaseRouteClient(request);
    await client.auth.signOut({ scope: "local" });
    return applyCookies(authRedirect(request, returnTo, 302));
  } catch {
    return authRedirect(request, returnTo, 302);
  }
}

export function GET() {
  return new Response("Method Not Allowed", { status: 405, headers: { allow: "POST", "cache-control": "no-store" } });
}
