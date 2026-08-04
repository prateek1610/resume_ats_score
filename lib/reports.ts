import { and, count, desc, eq, gt, gte, inArray, isNull, lte, or } from "drizzle-orm";
import { getDb } from "@/db";
import { resumeReports } from "@/db/schema";

export type NewReport = typeof resumeReports.$inferInsert;
export type SavedReport = typeof resumeReports.$inferSelect;

export async function createReport(report: NewReport) {
  const db = await getDb();
  const [created] = await db.insert(resumeReports).values(report).returning();
  return created;
}

export async function listReports(ownerEmail: string) {
  const db = await getDb();
  const now = new Date();
  return db
    .select({
      id: resumeReports.id,
      filename: resumeReports.filename,
      mode: resumeReports.mode,
      overallScore: resumeReports.overallScore,
      keywordScore: resumeReports.keywordScore,
      structureScore: resumeReports.structureScore,
      impactScore: resumeReports.impactScore,
      createdAt: resumeReports.createdAt,
      expiresAt: resumeReports.expiresAt,
    })
    .from(resumeReports)
    .where(and(eq(resumeReports.ownerEmail, ownerEmail), or(isNull(resumeReports.expiresAt), gt(resumeReports.expiresAt, now))))
    .orderBy(desc(resumeReports.createdAt))
    .limit(50);
}

export async function getReport(id: string, ownerEmail: string) {
  const db = await getDb();
  const [report] = await db
    .select()
    .from(resumeReports)
    .where(and(eq(resumeReports.id, id), eq(resumeReports.ownerEmail, ownerEmail), or(isNull(resumeReports.expiresAt), gt(resumeReports.expiresAt, new Date()))))
    .limit(1);
  return report ?? null;
}

export async function removeReport(id: string, ownerEmail: string) {
  const report = await getReport(id, ownerEmail);
  if (!report) return null;
  const db = await getDb();
  await db.delete(resumeReports).where(and(eq(resumeReports.id, id), eq(resumeReports.ownerEmail, ownerEmail)));
  return report;
}

export async function countReportsSince(ownerEmail: string, since: Date) {
  const db = await getDb();
  const [result] = await db
    .select({ value: count() })
    .from(resumeReports)
    .where(and(eq(resumeReports.ownerEmail, ownerEmail), gte(resumeReports.createdAt, since)));
  return result?.value ?? 0;
}

export async function removeAllReports(ownerEmail: string) {
  const db = await getDb();
  const reports = await db.select({ id: resumeReports.id, storageKey: resumeReports.storageKey }).from(resumeReports).where(eq(resumeReports.ownerEmail, ownerEmail));
  if (reports.length) await db.delete(resumeReports).where(eq(resumeReports.ownerEmail, ownerEmail));
  return reports;
}

export async function listAllOwnedReports(ownerEmail: string) {
  const db = await getDb();
  return db.select({ id: resumeReports.id, storageKey: resumeReports.storageKey }).from(resumeReports).where(eq(resumeReports.ownerEmail, ownerEmail));
}

export async function claimExpiredReports(limit = 25) {
  const db = await getDb();
  const expired = await db
    .select({ id: resumeReports.id, storageKey: resumeReports.storageKey })
    .from(resumeReports)
    .where(and(lte(resumeReports.expiresAt, new Date())))
    .limit(limit);
  if (expired.length) await db.delete(resumeReports).where(inArray(resumeReports.id, expired.map((report) => report.id)));
  return expired;
}
