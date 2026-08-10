export const ANALYTICS_RETENTION_DAYS = 90;

export type PageDimension = "landing" | "login" | "signup" | "password_help" | "dashboard" | "report" | "privacy" | "terms" | "other";

export function normalizeAnalyticsPath(pathname: string): PageDimension {
  if (pathname === "/") return "landing";
  if (pathname === "/login" || pathname.startsWith("/auth/")) return "login";
  if (pathname === "/signup") return "signup";
  if (pathname === "/forgot-password") return "password_help";
  if (pathname === "/dashboard") return "dashboard";
  if (pathname.startsWith("/reports/")) return "report";
  if (pathname === "/privacy") return "privacy";
  if (pathname === "/terms") return "terms";
  return "other";
}

export function isAnalyticsAdmin(email: string, configured = process.env.RESUMELENS_ANALYTICS_ADMIN_EMAILS ?? "") {
  const allowed = configured.split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
  return allowed.includes(email.trim().toLowerCase());
}
