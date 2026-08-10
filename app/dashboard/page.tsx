import Link from "next/link";
import { requireAppUser, signOutPath } from "@/lib/app-auth";
import { DAILY_ANALYSIS_LIMIT, REPORT_RETENTION_DAYS } from "@/lib/policy";
import { countReportsSince, listReports } from "@/lib/reports";
import { DashboardClient } from "./dashboard-client";
import { SignOutControl } from "@/app/sign-out-control";
import { errorType, securityLog } from "@/lib/security-log";
import { isAnalyticsAdmin } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ sample?: string }> }) {
  const user = await requireAppUser("/dashboard");
  const query = await searchParams;
  let reports: Awaited<ReturnType<typeof listReports>> = [];
  let usedToday: number | null = null;
  try {
    [reports, usedToday] = await Promise.all([
      listReports(user.email.toLowerCase()),
      countReportsSince(user.email.toLowerCase(), new Date(Date.now() - 24 * 60 * 60 * 1000)),
    ]);
  } catch (error) {
    securityLog("warn", "report_history_unavailable", undefined, { errorType: errorType(error) });
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <Link className="app-brand" href="/"><span className="app-brand-mark">◎</span>ResumeLens</Link>
        <div className="account-menu"><span>{user.displayName}</span>{isAnalyticsAdmin(user.email) && <Link href="/admin/analytics">Analytics</Link>}<SignOutControl href={signOutPath("/")} /></div>
      </header>
      <div className="dashboard-wrap">
        <DashboardClient
          sampleMode={query.sample === "1"}
          quota={{ used: usedToday, limit: DAILY_ANALYSIS_LIMIT, retentionDays: REPORT_RETENTION_DAYS }}
          signOutHref={signOutPath("/")}
          history={reports.map((report) => ({ ...report, createdAt: report.createdAt.toISOString(), expiresAt: report.expiresAt?.toISOString() ?? null }))}
        />
      </div>
    </main>
  );
}
