import type { NextRequest } from "next/server";
import { isSupabaseAuthConfigured } from "@/lib/auth/config";
import { authRedirect } from "@/lib/auth/http";
import { createSupabaseRouteClient } from "@/lib/auth/supabase-server";
import { chatGPTSignOutPath, safeRelativeReturnPath } from "@/lib/auth-paths";

export async function GET(request: NextRequest) {
  const returnTo = safeRelativeReturnPath(request.nextUrl.searchParams.get("return_to"), "/");
  if (!isSupabaseAuthConfigured()) return authRedirect(request, chatGPTSignOutPath(returnTo), 302);

  try {
    const { client, applyCookies } = createSupabaseRouteClient(request);
    await client.auth.signOut({ scope: "local" });
    return applyCookies(authRedirect(request, returnTo, 302));
  } catch {
    return authRedirect(request, returnTo, 302);
  }
}
