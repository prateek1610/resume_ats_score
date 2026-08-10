import { getDbBinding } from "@/db";
import { ANALYTICS_RETENTION_DAYS } from "@/lib/analytics-policy";
export { ANALYTICS_RETENTION_DAYS, isAnalyticsAdmin, normalizeAnalyticsPath } from "@/lib/analytics-policy";

export type AnalyticsEvent =
  | "page_view"
  | "analysis_completed"
  | "analysis_failed"
  | "analysis_rate_limited"
  | "report_deleted"
  | "account_deleted";

type AnalyticsRow = {
  day: string;
  event: AnalyticsEvent;
  dimension: string;
  event_count: number;
  total_value: number;
};

export async function recordAnalyticsEvent(event: AnalyticsEvent, dimension: string, value = 0) {
  const safeDimension = dimension.replace(/[^a-z0-9_:-]/gi, "").slice(0, 40) || "none";
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const id = `${day}:${event}:${safeDimension}`;
  const cutoff = new Date(now.getTime() - ANALYTICS_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const database = await getDbBinding();

  await database.batch([
    database.prepare(`INSERT INTO analytics_daily (id, day, event, dimension, event_count, total_value, updated_at)
      VALUES (?, ?, ?, ?, 1, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        event_count = event_count + 1,
        total_value = total_value + excluded.total_value,
        updated_at = excluded.updated_at`).bind(id, day, event, safeDimension, Math.round(value), now.getTime()),
    database.prepare("DELETE FROM analytics_daily WHERE day < ?").bind(cutoff),
  ]);
}

export async function getAnalyticsOverview(days = 30) {
  const boundedDays = Math.min(Math.max(Math.trunc(days), 7), ANALYTICS_RETENTION_DAYS);
  const today = new Date();
  const since = new Date(today.getTime() - (boundedDays - 1) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const database = await getDbBinding();
  const result = await database.prepare(`SELECT day, event, dimension, event_count, total_value
    FROM analytics_daily WHERE day >= ? ORDER BY day ASC`).bind(since).all<AnalyticsRow>();
  const rows = result.results ?? [];

  const daily = new Map<string, { day: string; pageViews: number; analyses: number; failures: number }>();
  for (let offset = boundedDays - 1; offset >= 0; offset -= 1) {
    const day = new Date(today.getTime() - offset * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    daily.set(day, { day, pageViews: 0, analyses: 0, failures: 0 });
  }

  const pages = new Map<string, number>();
  let pageViews = 0;
  let analyses = 0;
  let analysisFailures = 0;
  let rateLimited = 0;
  let scoreTotal = 0;
  let standalone = 0;
  let jobMatch = 0;
  let reportsDeleted = 0;

  for (const row of rows) {
    const day = daily.get(row.day);
    if (row.event === "page_view") {
      pageViews += row.event_count;
      pages.set(row.dimension, (pages.get(row.dimension) ?? 0) + row.event_count);
      if (day) day.pageViews += row.event_count;
    } else if (row.event === "analysis_completed") {
      analyses += row.event_count;
      scoreTotal += row.total_value;
      if (row.dimension === "job_match") jobMatch += row.event_count;
      else standalone += row.event_count;
      if (day) day.analyses += row.event_count;
    } else if (row.event === "analysis_failed") {
      analysisFailures += row.event_count;
      if (day) day.failures += row.event_count;
    } else if (row.event === "analysis_rate_limited") {
      rateLimited += row.event_count;
    } else if (row.event === "report_deleted") {
      reportsDeleted += row.event_count;
    }
  }

  const attempts = analyses + analysisFailures;
  const successRate = attempts ? Math.round((analyses / attempts) * 1000) / 10 : 100;
  return {
    days: boundedDays,
    pageViews,
    analyses,
    analysisFailures,
    rateLimited,
    reportsDeleted,
    averageScore: analyses ? Math.round(scoreTotal / analyses) : null,
    successRate,
    status: successRate >= 95 ? "Healthy" : successRate >= 85 ? "Watch" : "Needs attention",
    modes: { standalone, jobMatch },
    topPages: [...pages.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([page, count]) => ({ page, count })),
    daily: [...daily.values()],
  };
}
