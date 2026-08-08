"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnalysisView } from "@/components/analysis-view";
import type { ReportView } from "@/lib/report-view";
import type { ResumeAnalysis } from "@/lib/scoring";
import type { StructuredResume } from "@/lib/structured-resume";
import { AccountDataControls } from "./account-data-controls";

type HistoryItem = {
  id: string;
  filename: string;
  mode: "standalone" | "job_match";
  overallScore: number;
  keywordScore: number;
  structureScore: number;
  impactScore: number;
  createdAt: string;
  expiresAt: string | null;
};

type Props = { history: HistoryItem[]; sampleMode: boolean; quota: { used: number | null; limit: number; retentionDays: number }; signOutHref: string };

const MAX_RESUME_BYTES = 10 * 1024 * 1024;
const SUPPORTED_RESUME_EXTENSIONS = [".pdf", ".docx"];
const SAMPLE_VIEWS: Array<{ id: ReportView; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "job-match", label: "Job Match" },
  { id: "review", label: "Resume Review" },
  { id: "rewrites", label: "Rewrites" },
  { id: "checklist", label: "Missing Elements" },
  { id: "parsed-resume", label: "Parsed Resume" },
];

export function DashboardClient({ history, sampleMode, quota, signOutHref }: Props) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const sampleResult = useRef<HTMLElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sample, setSample] = useState<{ filename: string; analysis: ResumeAnalysis; structuredResume: StructuredResume | null } | null>(null);
  const [sampleView, setSampleView] = useState<ReportView>("overview");

  useEffect(() => {
    if (!sample || !sampleResult.current) return;
    sampleResult.current.focus({ preventScroll: true });
    sampleResult.current.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }, [sample]);

  function selectResume(selectedFile: File | null) {
    if (!selectedFile) {
      setFile(null);
      return;
    }
    const filename = selectedFile.name.toLowerCase();
    if (!SUPPORTED_RESUME_EXTENSIONS.some((extension) => filename.endsWith(extension))) {
      setFile(null);
      setError("Choose a PDF or DOCX resume.");
      if (fileInput.current) fileInput.current.value = "";
      return;
    }
    if (selectedFile.size === 0 || selectedFile.size > MAX_RESUME_BYTES) {
      setFile(null);
      setError(selectedFile.size === 0 ? "This file is empty. Choose a different resume." : "Resume files must be 10 MB or smaller.");
      if (fileInput.current) fileInput.current.value = "";
      return;
    }
    setFile(selectedFile);
    setError("");
  }

  async function submitResume(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError("Choose a PDF or DOCX resume first.");
      return;
    }
    setLoading(true);
    setError("");
    const form = new FormData();
    form.set("resume", file);
    form.set("jobDescription", jobDescription);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 30_000);
    try {
      const response = await fetch("/api/reports", { method: "POST", body: form, signal: controller.signal });
      const payload = await response.json() as { error?: string; report?: { id: string } };
      if (!response.ok || !payload.report) throw new Error(payload.error ?? "Analysis failed.");
      router.push(`/reports/${payload.report.id}/overview`);
    } catch (cause) {
      setError(cause instanceof DOMException && cause.name === "AbortError" ? "The analysis took too long. Please retry with a smaller text-based file." : cause instanceof Error ? cause.message : "Analysis failed. Please retry.");
      setLoading(false);
    } finally {
      window.clearTimeout(timeout);
    }
  }

  async function runSample() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/reports/sample", { method: "POST" });
      const payload = await response.json() as { error?: string; filename?: string; analysis?: ResumeAnalysis; structuredResume?: StructuredResume };
      if (!response.ok || !payload.analysis || !payload.filename) throw new Error(payload.error ?? "Sample analysis failed.");
      setSampleView("overview");
      setSample({ filename: payload.filename, analysis: payload.analysis, structuredResume: payload.structuredResume ?? null });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sample analysis failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="dashboard-grid">
        <section className="upload-panel">
          <p className="eyebrow">Start a new review</p>
          <h1>Build a resume that proves your fit.</h1>
          <p className="dashboard-lead">Upload once for a seven-dimension ATS review. Add a job description to reveal supported requirements, weak evidence and genuine gaps.</p>

          <div className="analysis-deliverables" aria-label="What your report includes">
            <span><b>01</b> Exact-line strengths</span>
            <span><b>02</b> Prioritized fixes</span>
            <span><b>03</b> Rewrite templates</span>
            <span><b>04</b> Missing-elements check</span>
          </div>

          <div className="production-policy" aria-label="Free plan usage and retention">
            <span><strong>{quota.used === null ? "—" : Math.max(0, quota.limit - quota.used)}</strong> analyses remaining</span>
            <span><strong>{quota.retentionDays} days</strong> private retention</span>
            <a href="/privacy">How your data is handled</a>
          </div>

          {sampleMode && (
            <div className="sample-banner">
              <div><strong>Want to see a finished report first?</strong><span>Use our fictional Operations Analyst resume and job description.</span></div>
              <button type="button" onClick={runSample} disabled={loading}>Analyze sample</button>
            </div>
          )}

          <form onSubmit={submitResume} noValidate>
            <input
              ref={fileInput}
              className="sr-only"
              id="resume"
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              aria-describedby="resume-help"
              onChange={(event) => selectResume(event.target.files?.[0] ?? null)}
            />
            <div className="workflow-step-heading"><span>1</span><div><strong>Choose your resume</strong><small>Your file is validated before analysis.</small></div></div>
            <button className={`file-drop${file ? " file-selected" : ""}`} type="button" onClick={() => fileInput.current?.click()}>
              <span className="drop-icon" aria-hidden="true">↑</span>
              <span><strong>{file ? file.name : "Select a PDF or DOCX"}</strong><small id="resume-help">{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB selected and ready` : "Maximum size 10 MB"}</small></span>
              <em>{file ? "Change" : "Browse"}</em>
            </button>

            <label className="field-label" htmlFor="job-description">
              <span className="workflow-step-label"><b>2</b><span><strong>Target job description</strong><small>Optional, but recommended for job matching.</small></span></span>
              <em>Optional</em>
            </label>
            <textarea
              id="job-description"
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value.slice(0, 20_000))}
              placeholder="Paste the full job description to compare requirements, tools, responsibilities and keywords…"
              rows={8}
            />
            <div className="form-meta">
              <span>{jobDescription.length.toLocaleString()} / 20,000</span>
            </div>
            <div className={`analysis-mode-card${jobDescription.trim() ? " mode-targeted" : ""}`} aria-live="polite">
              <span aria-hidden="true">{jobDescription.trim() ? "⌁" : "◎"}</span>
              <div><strong>{jobDescription.trim() ? "Targeted job-match analysis" : "Standalone resume analysis"}</strong><p>{jobDescription.trim() ? "Your report will map each important job requirement to evidence found in the resume." : "Your report will focus on ATS structure, clarity, impact, tone, redundancy and completeness."}</p></div>
            </div>
            {error && <div className="form-error" role="alert">{error}</div>}
            <button className="analyze-button" type="submit" disabled={loading}>
              {loading ? <><span className="spinner" /> Building your report…</> : jobDescription.trim() ? "Analyze against this job →" : "Analyze my resume →"}
            </button>
            <p className="privacy-note">Private to your account · Saved for 30 days · Delete anytime</p>
          </form>
        </section>

        <aside className="history-panel">
          <div className="history-heading"><div><p className="eyebrow">Saved history</p><h2>Your reports</h2></div><span>{history.length}</span></div>
          {history.length ? (
            <div className="history-list">
              {history.map((report) => (
                <a href={`/reports/${report.id}/overview`} key={report.id}>
                  <span className={`history-score ${report.overallScore >= 75 ? "score-good" : ""}`}>{report.overallScore}</span>
                  <span><strong>{report.filename}</strong><small>{report.mode === "job_match" ? "Job match" : "Standalone"} · {new Date(report.createdAt).toLocaleDateString()}{report.expiresAt ? ` · expires ${new Date(report.expiresAt).toLocaleDateString()}` : ""}</small></span>
                  <em aria-hidden="true">›</em>
                </a>
              ))}
            </div>
          ) : (
            <div className="history-empty"><span aria-hidden="true">◎</span><h3>Your first report starts here</h3><p>Complete an analysis and it will stay available in this private workspace.</p></div>
          )}
          <AccountDataControls signOutHref={signOutHref} />
        </aside>
      </div>

      {sample && (
        <section className="sample-result" aria-live="polite" ref={sampleResult} tabIndex={-1}>
          <div className="sample-result-heading"><div><p className="eyebrow">Interactive sample report</p><h2>{sample.filename}</h2><span>Explore the same analysis structure your own resume will receive.</span></div><button type="button" onClick={() => setSample(null)}>Close sample</button></div>
          <nav className="sample-report-tabs" aria-label="Sample report sections">{SAMPLE_VIEWS.map((item) => <button type="button" aria-pressed={sampleView === item.id} onClick={() => setSampleView(item.id)} key={item.id}>{item.label}</button>)}</nav>
          <AnalysisView analysis={sample.analysis} compact view={sampleView} structuredResume={sample.structuredResume} />
        </section>
      )}
    </>
  );
}
