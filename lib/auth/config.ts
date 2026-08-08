export type SupabaseAuthConfig = {
  url: string;
  publishableKey: string;
  siteOrigin: string;
};

export function getSupabaseAuthConfig(): SupabaseAuthConfig | null {
  const url = process.env.SUPABASE_URL?.trim();
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY?.trim();
  const configuredSiteUrl = process.env.AUTH_SITE_URL?.trim();
  if (!url || !publishableKey || !configuredSiteUrl) return null;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") return null;
    const site = new URL(configuredSiteUrl);
    if (site.protocol !== "https:" && site.hostname !== "localhost") return null;
    if (site.username || site.password || site.pathname !== "/" || site.search || site.hash) return null;
    return { url: parsed.origin, publishableKey, siteOrigin: site.origin };
  } catch {
    return null;
  }
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
  return getSupabaseAuthConfig()?.siteOrigin ?? new URL(requestUrl).origin;
}
