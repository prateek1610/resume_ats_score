import { and, desc, eq } from "drizzle-orm";
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
    })
    .from(resumeReports)
    .where(eq(resumeReports.ownerEmail, ownerEmail))
    .orderBy(desc(resumeReports.createdAt))
    .limit(50);
}

export async function getReport(id: string, ownerEmail: string) {
  const db = await getDb();
  const [report] = await db
    .select()
    .from(resumeReports)
    .where(and(eq(resumeReports.id, id), eq(resumeReports.ownerEmail, ownerEmail)))
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
