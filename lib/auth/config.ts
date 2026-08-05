export type SupabaseAuthConfig = {
  url: string;
  publishableKey: string;
};

export function getSupabaseAuthConfig(): SupabaseAuthConfig | null {
  const url = process.env.SUPABASE_URL?.trim();
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !publishableKey) return null;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") return null;
  } catch {
    return null;
  }

  return { url, publishableKey };
}

export function isSupabaseAuthConfigured() {
  return getSupabaseAuthConfig() !== null;
}

export function requireSupabaseAuthConfig() {
  const config = getSupabaseAuthConfig();
  if (!config) throw new Error("Supabase authentication is not configured.");
  return config;
}

export function authSiteOrigin(requestUrl: string) {
  const configuredOrigin = process.env.AUTH_SITE_URL?.trim();
  if (configuredOrigin) {
    try {
      const origin = new URL(configuredOrigin);
      if (origin.protocol === "https:" || origin.hostname === "localhost") return origin.origin;
    } catch {
      // Fall back to the request origin when local configuration is invalid.
    }
  }

  const requestOrigin = new URL(requestUrl);
  return requestOrigin.origin;
}
