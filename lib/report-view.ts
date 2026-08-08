export const REPORT_VIEWS = ["overview", "job-match", "review", "rewrites", "checklist", "parsed-resume"] as const;
export type ReportView = (typeof REPORT_VIEWS)[number];

export function isReportView(value: string): value is ReportView {
  return REPORT_VIEWS.includes(value as ReportView);
}
