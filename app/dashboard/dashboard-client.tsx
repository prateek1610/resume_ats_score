"use client";

import { useRef, useState } from "react";
import { AnalysisView } from "@/components/analysis-view";
import type { ResumeAnalysis } from "@/lib/scoring";
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

export function DashboardClient({ history, sampleMode, quota, signOutHref }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sample, setSample] = useState<{ filename: string; analysis: ResumeAnalysis } | null>(null);

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
      window.location.assign(`/reports/${payload.report.id}`);
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
      const payload = await response.json() as { error?: string; filename?: string; analysis?: ResumeAnalysis };
      if (!response.ok || !payload.analysis || !payload.filename) throw new Error(payload.error ?? "Sample analysis failed.");
      setSample({ filename: payload.filename, analysis: payload.analysis });
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
          <p className="eyebrow">New analysis</p>
          <h1>Check your resume.</h1>
          <p className="dashboard-lead">Get a standalone ATS review or add a job description for a targeted match score.</p>

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
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setError("");
              }}
            />
            <button className={`file-drop${file ? " file-selected" : ""}`} type="button" onClick={() => fileInput.current?.click()}>
              <span className="drop-icon" aria-hidden="true">↑</span>
              <span><strong>{file ? file.name : "Choose your resume"}</strong><small>{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB selected` : "PDF or DOCX, up to 10 MB"}</small></span>
              <em>{file ? "Change" : "Browse"}</em>
            </button>

            <label className="field-label" htmlFor="job-description">
              Target job description <span>Optional</span>
            </label>
            <textarea
              id="job-description"
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value.slice(0, 20_000))}
              placeholder="Paste the role description to calculate keyword match and skill gaps…"
              rows={8}
            />
            <div className="form-meta">
              <span>{jobDescription.trim() ? "Job-match mode" : "Standalone mode"}</span>
              <span>{jobDescription.length.toLocaleString()} / 20,000</span>
            </div>
            {error && <div className="form-error" role="alert">{error}</div>}
            <button className="analyze-button" type="submit" disabled={loading}>
              {loading ? <><span className="spinner" /> Analyzing securely…</> : "Analyze and save report"}
            </button>
            <p className="privacy-note">Your original file and report are private to your account. You can delete both anytime.</p>
          </form>
        </section>

        <aside className="history-panel">
          <div className="history-heading"><div><p className="eyebrow">Saved history</p><h2>Your reports</h2></div><span>{history.length}</span></div>
          {history.length ? (
            <div className="history-list">
              {history.map((report) => (
                <a href={`/reports/${report.id}`} key={report.id}>
                  <span className={`history-score ${report.overallScore >= 75 ? "score-good" : ""}`}>{report.overallScore}</span>
                  <span><strong>{report.filename}</strong><small>{report.mode === "job_match" ? "Job match" : "Standalone"} · {new Date(report.createdAt).toLocaleDateString()}{report.expiresAt ? ` · expires ${new Date(report.expiresAt).toLocaleDateString()}` : ""}</small></span>
                  <em aria-hidden="true">›</em>
                </a>
              ))}
            </div>
          ) : (
            <div className="history-empty"><span aria-hidden="true">◎</span><h3>No reports yet</h3><p>Your saved ATS analyses will appear here.</p></div>
          )}
          <AccountDataControls signOutHref={signOutHref} />
        </aside>
      </div>

      {sample && (
        <section className="sample-result" aria-live="polite">
          <div className="sample-result-heading"><div><p className="eyebrow">Sample report</p><h2>{sample.filename}</h2></div><button type="button" onClick={() => setSample(null)}>Close</button></div>
          <AnalysisView analysis={sample.analysis} compact />
        </section>
      )}
    </>
  );
}
