export const DAILY_ANALYSIS_LIMIT = 10;
export const ANALYSIS_BURST_LIMIT = 3;
export const ANALYSIS_BURST_WINDOW_MS = 5 * 60 * 1000;
export const SAMPLE_BURST_LIMIT = 10;
export const REPORT_RETENTION_DAYS = 30;

export function reportExpiryDate(from = new Date()) {
  return new Date(from.getTime() + REPORT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}
