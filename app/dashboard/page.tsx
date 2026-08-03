import { chatGPTSignOutPath } from "@/app/chatgpt-auth";
import Link from "next/link";
import { requireAppUser } from "@/lib/app-auth";
import { listReports } from "@/lib/reports";
import { DashboardClient } from "./dashboard-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ sample?: string }> }) {
  const user = await requireAppUser("/dashboard");
  const query = await searchParams;
  let reports: Awaited<ReturnType<typeof listReports>> = [];
  try {
    reports = await listReports(user.email.toLowerCase());
  } catch (error) {
    console.warn(JSON.stringify({ event: "report_history_unavailable", message: error instanceof Error ? error.message : "Unexpected error" }));
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <Link className="app-brand" href="/"><span className="app-brand-mark">◎</span>ResumeLens</Link>
        <div className="account-menu"><span>{user.displayName}</span><a href={chatGPTSignOutPath("/")}>Sign out</a></div>
      </header>
      <div className="dashboard-wrap">
        <DashboardClient
          sampleMode={query.sample === "1"}
          history={reports.map((report) => ({ ...report, createdAt: report.createdAt.toISOString() }))}
        />
      </div>
    </main>
  );
}
