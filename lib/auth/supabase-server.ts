import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireSupabaseAuthConfig } from "@/lib/auth/config";

type PendingCookie = { name: string; value: string; options: CookieOptions };

export async function createSupabaseServerClient() {
  const config = requireSupabaseAuthConfig();
  const cookieStore = await cookies();

  return createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (items: PendingCookie[]) => {
        try {
          for (const item of items) cookieStore.set(item.name, item.value, item.options);
        } catch {
          // Server Components cannot write cookies. The auth proxy refreshes them.
        }
      },
    },
  });
}

export function createSupabaseRouteClient(request: NextRequest) {
  const config = requireSupabaseAuthConfig();
  const pendingCookies: PendingCookie[] = [];
  const client = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (items: PendingCookie[]) => {
        pendingCookies.push(...items);
      },
    },
  });

  return {
    client,
    applyCookies<T extends NextResponse>(response: T) {
      for (const item of pendingCookies) {
        response.cookies.set(item.name, item.value, item.options);
      }
      return response;
    },
  };
}
