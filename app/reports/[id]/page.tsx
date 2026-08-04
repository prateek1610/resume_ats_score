import { notFound } from "next/navigation";
import Link from "next/link";
import { chatGPTSignOutPath } from "@/app/chatgpt-auth";
import { AnalysisView } from "@/components/analysis-view";
import { requireAppUser } from "@/lib/app-auth";
import { getReport } from "@/lib/reports";
import type { ResumeAnalysis } from "@/lib/scoring";
import { DeleteReportButton } from "./delete-report-button";

export const dynamic = "force-dynamic";

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAppUser(`/reports/${id}`);
  const report = await getReport(id, user.email.toLowerCase());
  if (!report) notFound();

  const analysis: ResumeAnalysis = {
    mode: report.mode,
    overallScore: report.overallScore,
    keywordScore: report.keywordScore,
    structureScore: report.structureScore,
    impactScore: report.impactScore,
    essentialsScore: report.essentialsScore,
    matchedKeywords: report.matchedKeywords,
    missingKeywords: report.missingKeywords,
    strengths: report.strengths,
    recommendations: report.recommendations,
    sections: report.sections,
    details: report.analysisDetails ?? {
      targetRole: report.mode === "job_match" ? "Target role" : "General ATS readiness",
      resumeProfile: "General professional experience",
      roleFitScore: report.keywordScore,
      roleFitVerdict: "Saved ATS review",
      fitLabel: "Saved ATS review",
      contextSummary: report.mode === "job_match"
        ? "This report predates contextual requirement mapping. Re-upload the resume to generate the deeper evidence review."
        : "This report measures ATS readability without a supplied job description.",
      strongestEvidence: report.strengths[0] ?? "No strong evidence summary is available for this earlier report.",
      biggestRisk: report.recommendations[0]?.detail ?? "No critical risk was recorded.",
      requirementEvidence: [],
      mismatches: [],
      transferableStrengths: [],
      bulletInsights: [],
      riskFlags: [],
      resumeReview: { dimensions: [], strengths: [], areasToImprove: [], suggestedRewrites: [], suggestedAdditions: [], missingElements: [] },
    },
    stats: report.stats,
  };

  return (
    <main className="app-shell">
      <header className="app-header">
        <Link className="app-brand" href="/"><span className="app-brand-mark">◎</span>ResumeLens</Link>
        <div className="account-menu"><a href="/dashboard">Dashboard</a><a href={chatGPTSignOutPath("/")}>Sign out</a></div>
      </header>
      <div className="report-wrap">
        <div className="report-toolbar">
          <div><Link className="back-link" href="/dashboard">← All reports</Link><p className="eyebrow">Saved ATS report</p><h1>{report.filename}</h1><p>{report.mode === "job_match" ? "Job-description match" : "Standalone review"} · {report.createdAt.toLocaleDateString()}{report.expiresAt ? ` · available until ${report.expiresAt.toLocaleDateString()}` : ""}</p></div>
          <div className="report-actions"><a href={`/api/resumes/${report.id}`}>Download resume</a><DeleteReportButton reportId={report.id} /></div>
        </div>
        <AnalysisView analysis={analysis} />
        <p className="report-disclaimer">ResumeLens provides heuristic ATS guidance. Scores can differ across employers and do not guarantee interviews or hiring outcomes.</p>
      </div>
    </main>
  );
}
