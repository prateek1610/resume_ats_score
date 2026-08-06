import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAuthConfig } from "@/lib/auth/config";

export async function refreshAuthSession(request: NextRequest, requestHeaders = new Headers(request.headers)) {
  const config = getSupabaseAuthConfig();
  if (!config) return NextResponse.next({ request: { headers: requestHeaders } });

  let response = NextResponse.next({ request: { headers: requestHeaders } });
  const supabase = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (items) => {
        for (const item of items) request.cookies.set(item.name, item.value);
        response = NextResponse.next({ request: { headers: requestHeaders } });
        for (const item of items) response.cookies.set(item.name, item.value, item.options);
      },
    },
  });

  await supabase.auth.getClaims().catch(() => null);
  response.headers.set("cache-control", "private, no-store");
  return response;
}
