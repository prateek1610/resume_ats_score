import Link from "next/link";
import { notFound } from "next/navigation";
import { getAnalyticsOverview, isAnalyticsAdmin, ANALYTICS_RETENTION_DAYS } from "@/lib/analytics";
import { requireAppUser, signOutPath } from "@/lib/app-auth";
import { SignOutControl } from "@/app/sign-out-control";

export const dynamic = "force-dynamic";
export const metadata = { title: "Analytics & Monitoring — ResumeLens" };

const pageLabels: Record<string, string> = {
  landing: "Landing page",
  login: "Login and email verification",
  signup: "Signup",
  password_help: "Password recovery",
  dashboard: "Resume dashboard",
  report: "Analysis reports",
  privacy: "Privacy policy",
  terms: "Terms",
  other: "Other public pages",
};

export default async function AnalyticsPage() {
  const user = await requireAppUser("/admin/analytics");
  if (!isAnalyticsAdmin(user.email)) notFound();
  const overview = await getAnalyticsOverview(30);
  const maxDaily = Math.max(1, ...overview.daily.flatMap((item) => [item.pageViews, item.analyses]));

  return <main className="app-shell analytics-shell">
    <header className="app-header">
      <Link className="app-brand" href="/"><span className="app-brand-mark">◎</span>ResumeLens</Link>
      <div className="account-menu"><Link href="/dashboard">Dashboard</Link><span>{user.displayName}</span><SignOutControl href={signOutPath("/")} /></div>
    </header>

    <div className="analytics-wrap">
      <section className="analytics-heading">
        <div><p className="eyebrow">Owner workspace</p><h1>Analytics & monitoring</h1><p>Anonymous, first-party product signals for the last {overview.days} days. No cookies, identity profiles, resume content, email addresses, IP addresses or third-party trackers are stored here.</p></div>
        <div className={`service-status service-status-${overview.status.toLowerCase().replace(/\s+/g, "-")}`}><span aria-hidden="true" /> <div><small>Analysis service</small><strong>{overview.status}</strong><em>{overview.successRate}% successful</em></div></div>
      </section>

      <section className="analytics-kpis" aria-label="Key product metrics">
        <article><span>Page views</span><strong>{overview.pageViews.toLocaleString()}</strong><small>Deduplicated per route and browser tab session</small></article>
        <article><span>Completed analyses</span><strong>{overview.analyses.toLocaleString()}</strong><small>{overview.modes.jobMatch} job match · {overview.modes.standalone} standalone</small></article>
        <article><span>Average ATS score</span><strong>{overview.averageScore ?? "—"}{overview.averageScore !== null && <small>/100</small>}</strong><small>Across completed analyses only</small></article>
        <article><span>Processing failures</span><strong>{overview.analysisFailures.toLocaleString()}</strong><small>{overview.rateLimited} requests safely rate-limited</small></article>
      </section>

      <div className="analytics-grid">
        <section className="analytics-panel analytics-trend-panel">
          <div className="analytics-panel-heading"><div><p className="eyebrow">30-day trend</p><h2>Traffic and completed analyses</h2></div><div className="analytics-legend"><span><i className="legend-views" /> Views</span><span><i className="legend-analyses" /> Analyses</span></div></div>
          <div className="analytics-chart" role="img" aria-label="Daily page views and completed resume analyses">
            {overview.daily.map((item) => <div className="analytics-day" key={item.day} title={`${item.day}: ${item.pageViews} views, ${item.analyses} analyses`}>
              <div className="analytics-bars"><span className="bar-views" style={{ height: `${Math.max(2, item.pageViews / maxDaily * 100)}%` }} /><span className="bar-analyses" style={{ height: `${Math.max(2, item.analyses / maxDaily * 100)}%` }} /></div>
              <small>{new Date(`${item.day}T00:00:00Z`).getUTCDate()}</small>
            </div>)}
          </div>
        </section>

        <section className="analytics-panel">
          <div className="analytics-panel-heading"><div><p className="eyebrow">Journey</p><h2>Most viewed areas</h2></div></div>
          {overview.topPages.length ? <ol className="analytics-page-list">{overview.topPages.map((item) => <li key={item.page}><span>{pageLabels[item.page] ?? item.page}</span><strong>{item.count.toLocaleString()}</strong></li>)}</ol> : <div className="analytics-empty"><strong>No traffic yet</strong><p>First-party page counts will appear after visitors use the updated site.</p></div>}
        </section>

        <section className="analytics-panel analytics-operations">
          <div className="analytics-panel-heading"><div><p className="eyebrow">Operations</p><h2>Reliability signals</h2></div></div>
          <dl><div><dt>Successful analyses</dt><dd>{overview.successRate}%</dd></div><div><dt>Failed analyses</dt><dd>{overview.analysisFailures}</dd></div><div><dt>Rate-limited requests</dt><dd>{overview.rateLimited}</dd></div><div><dt>User-deleted reports</dt><dd>{overview.reportsDeleted}</dd></div></dl>
          <a className="health-link" href="/api/health" target="_blank" rel="noreferrer">Open live health endpoint <span aria-hidden="true">↗</span></a>
        </section>

        <section className="analytics-panel analytics-privacy-card">
          <div className="analytics-panel-heading"><div><p className="eyebrow">Privacy controls</p><h2>What is deliberately excluded</h2></div></div>
          <ul><li>Resume text, filenames and job descriptions</li><li>Names, email addresses and account identifiers</li><li>IP addresses, device fingerprints and user agents</li><li>Advertising cookies and cross-site identifiers</li></ul>
          <p>Daily aggregates are automatically removed after {ANALYTICS_RETENTION_DAYS} days.</p>
        </section>
      </div>
    </div>
  </main>;
}
