import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { Recommendation, ResumeAnalysis } from "@/lib/scoring";
import type { StructuredResume } from "@/lib/structured-resume";

export const resumeReports = sqliteTable(
  "resume_reports",
  {
    id: text("id").primaryKey(),
    ownerEmail: text("owner_email").notNull(),
    filename: text("filename").notNull(),
    storageKey: text("storage_key"),
    contentType: text("content_type").notNull(),
    fileSize: integer("file_size").notNull(),
    mode: text("mode", { enum: ["standalone", "job_match"] }).notNull(),
    jobDescription: text("job_description"),
    overallScore: integer("overall_score").notNull(),
    keywordScore: integer("keyword_score").notNull(),
    structureScore: integer("structure_score").notNull(),
    impactScore: integer("impact_score").notNull(),
    essentialsScore: integer("essentials_score").notNull(),
    matchedKeywords: text("matched_keywords", { mode: "json" }).$type<string[]>().notNull(),
    missingKeywords: text("missing_keywords", { mode: "json" }).$type<string[]>().notNull(),
    strengths: text("strengths", { mode: "json" }).$type<string[]>().notNull(),
    recommendations: text("recommendations", { mode: "json" }).$type<Recommendation[]>().notNull(),
    sections: text("sections", { mode: "json" }).$type<ResumeAnalysis["sections"]>().notNull(),
    stats: text("stats", { mode: "json" }).$type<ResumeAnalysis["stats"]>().notNull(),
    analysisDetails: text("analysis_details", { mode: "json" }).$type<ResumeAnalysis["details"]>(),
    structuredResume: text("structured_resume", { mode: "json" }).$type<StructuredResume>(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("resume_reports_owner_created_idx").on(table.ownerEmail, table.createdAt),
    index("resume_reports_expires_idx").on(table.expiresAt),
  ],
);

export const rateLimitWindows = sqliteTable(
  "rate_limit_windows",
  {
    key: text("key").primaryKey(),
    scope: text("scope").notNull(),
    windowStart: integer("window_start", { mode: "timestamp_ms" }).notNull(),
    requestCount: integer("request_count").notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("rate_limit_windows_updated_idx").on(table.updatedAt)],
);

export const analyticsDaily = sqliteTable(
  "analytics_daily",
  {
    id: text("id").primaryKey(),
    day: text("day").notNull(),
    event: text("event").notNull(),
    dimension: text("dimension").notNull(),
    eventCount: integer("event_count").notNull(),
    totalValue: integer("total_value").notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("analytics_daily_day_idx").on(table.day),
    index("analytics_daily_event_day_idx").on(table.event, table.day),
  ],
);
