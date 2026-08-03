import type { ResumeAnalysis, SectionInsight } from "@/lib/scoring";

type AnalysisViewProps = {
  analysis: ResumeAnalysis;
  compact?: boolean;
};

const metricLabels = {
  keywordScore: "Role relevance",
  structureScore: "ATS structure",
  impactScore: "Achievement impact",
  essentialsScore: "Core completeness",
} as const;

function scoreVerdict(score: number) {
  if (score >= 85) return { title: "Interview-ready foundation", copy: "Your resume has strong ATS fundamentals. Focus on the smaller refinements below." };
  if (score >= 70) return { title: "Competitive with clear upside", copy: "The core is working. A few targeted changes can materially improve recruiter confidence." };
  if (score >= 55) return { title: "Promising, but not yet sharp", copy: "Important evidence is present, but structure and impact need focused improvement." };
  return { title: "Needs a focused rewrite", copy: "Foundational gaps may prevent your strongest experience from being seen." };
}

function normalizeSection(section: Partial<SectionInsight> & { name: string; present: boolean }): SectionInsight {
  const score = section.score ?? (section.present ? 70 : 0);
  return {
    name: section.name,
    present: section.present,
    score,
    status: section.status ?? (section.present ? "improve" : "missing"),
    feedback: section.feedback ?? (section.present ? "This standard section was detected." : "This section was not detected."),
    checks: section.checks ?? [section.present ? "ATS heading recognized" : "Section not detected"],
  };
}

function ChapterHeading({ number, eyebrow, title, copy }: { number: string; eyebrow: string; title: string; copy: string }) {
  return (
    <header className="chapter-heading">
      <span>{number}</span>
      <div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2><p>{copy}</p></div>
    </header>
  );
}

export function AnalysisView({ analysis, compact = false }: AnalysisViewProps) {
  const verdict = scoreVerdict(analysis.overallScore);
  const details = analysis.details ?? {
    targetRole: analysis.mode === "job_match" ? "Target role" : "General ATS readiness",
    resumeProfile: "General professional experience",
    roleFitScore: analysis.keywordScore,
    roleFitVerdict: "Saved ATS review",
    fitLabel: "ATS review",
    contextSummary: "Upload this resume again to generate the newest contextual analysis.",
    strongestEvidence: analysis.strengths[0] ?? "No strong evidence summary is available.",
    biggestRisk: analysis.recommendations[0]?.detail ?? "No critical risk was detected.",
    requirementEvidence: [],
    mismatches: [],
    transferableStrengths: [],
    bulletInsights: [],
    riskFlags: [],
  };
  const sections = analysis.sections.map(normalizeSection);
  const highPriority = analysis.recommendations.filter((item) => item.priority === "high").length;
  const supportedCount = details.requirementEvidence.filter((item) => item.status === "supported").length;
  const partialCount = details.requirementEvidence.filter((item) => item.status === "partial").length;
  const missingCount = details.requirementEvidence.filter((item) => item.status === "missing").length;
  const roleFitScore = details.roleFitScore ?? analysis.keywordScore;
  const resumeProfile = details.resumeProfile ?? "General professional experience";
  const roleFitVerdict = details.roleFitVerdict ?? details.fitLabel;
  const mismatches = details.mismatches ?? details.requirementEvidence.filter((item) => item.status !== "supported").map((item) => ({
    requirement: item.requirement,
    category: item.category ?? "skill" as const,
    impact: item.status === "missing" ? "important" as const : "minor" as const,
    reason: item.status === "missing" ? "No direct evidence appears in the resume." : "Only partial evidence appears in the resume.",
    action: item.guidance,
  }));
  const transferableStrengths = details.transferableStrengths ?? details.requirementEvidence.filter((item) => item.status !== "missing").slice(0, 5).map((item) => item.requirement);
  const diagnostics = [
    [analysis.stats.wordCount, "Words"],
    [analysis.stats.bulletCount, "Bullets"],
    [analysis.stats.metricCount, "Metrics"],
    [analysis.stats.actionVerbCount, "Action verbs"],
    [analysis.stats.weakPhraseCount ?? 0, "Weak phrases"],
    [analysis.stats.longBulletCount ?? 0, "Long bullets"],
  ];

  return (
    <div className={`analysis-view analysis-view-v2${compact ? " analysis-view-compact" : ""}`}>
      <section className="analysis-score-panel analysis-hero">
        <div className="analysis-score-ring" style={{ "--score": analysis.overallScore } as React.CSSProperties} aria-label={`ATS score ${analysis.overallScore} out of 100`}>
          <span>{analysis.overallScore}</span><small>/100</small>
        </div>
        <div className="analysis-score-copy">
          <p className="eyebrow">Overall resume readiness</p>
          <h2>{verdict.title}</h2>
          <p>{verdict.copy} {analysis.mode === "job_match" ? `This review is tailored for ${details.targetRole}.` : "Add a job description for role-specific evidence matching."}</p>
          <div className="analysis-kpis" aria-label="Report highlights">
            <span><strong>{analysis.strengths.length}</strong> strengths</span>
            <span><strong>{highPriority}</strong> priority fixes</span>
            {analysis.mode === "job_match" && <span><strong>{supportedCount}</strong> requirements proved</span>}
          </div>
        </div>
      </section>

      <nav className="report-jump-nav" aria-label="Analysis sections">
        <a href="#overview"><span>01</span> Overview</a>
        {analysis.mode === "job_match" && <a href="#role-fit"><span>02</span> Role fit</a>}
        <a href="#resume-quality"><span>{analysis.mode === "job_match" ? "03" : "02"}</span> Resume quality</a>
        <a href="#action-plan"><span>{analysis.mode === "job_match" ? "04" : "03"}</span> Action plan</a>
      </nav>

      <section className="report-chapter" id="overview">
        <ChapterHeading number="01" eyebrow="Overview" title="Your report at a glance" copy="Start here: overall performance, strongest proof and the clearest risk." />

        <div className="analysis-metrics" aria-label="Score breakdown">
          {(Object.keys(metricLabels) as Array<keyof typeof metricLabels>).map((key) => (
            <div className="analysis-metric" key={key}><span>{metricLabels[key]}</span><strong>{analysis[key]}</strong><div><i style={{ width: `${analysis[key]}%` }} /></div></div>
          ))}
        </div>

        <div className="overview-grid">
          <article className="overview-context">
            <p className="eyebrow">Target context</p><h3>{details.targetRole}</h3><span>{details.fitLabel}</span><p>{details.contextSummary}</p>
          </article>
          <article className="overview-insight overview-positive"><span>✓</span><div><p className="eyebrow">Strongest proof</p><blockquote>“{details.strongestEvidence}”</blockquote></div></article>
          <article className="overview-insight overview-risk"><span>!</span><div><p className="eyebrow">Biggest risk</p><p>{details.biggestRisk}</p></div></article>
        </div>

        <div className="analysis-columns analysis-snapshot">
          <section className="report-card report-card-positive">
            <div className="report-card-title"><span className="card-icon card-icon-good">✓</span><div><p className="eyebrow">Good points</p><h3>What is already working</h3></div></div>
            <ul className="strength-list">{analysis.strengths.map((strength) => <li key={strength}>{strength}</li>)}</ul>
          </section>
          <section className="report-card report-card-focus">
            <div className="report-card-title"><span className="card-icon card-icon-warn">!</span><div><p className="eyebrow">Fix first</p><h3>Highest-impact improvements</h3></div></div>
            <div className="focus-list">
              {analysis.recommendations.slice(0, 4).map((item, index) => <article key={item.id}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{item.title}</strong><p>{item.detail}</p></div></article>)}
              {!analysis.recommendations.length && <p className="empty-copy">No critical issues were found.</p>}
            </div>
          </section>
        </div>
      </section>

      {analysis.mode === "job_match" && (
        <section className="report-chapter" id="role-fit">
          <ChapterHeading number="02" eyebrow="Role fit" title="Job requirements versus your evidence" copy="See exactly what is proved, only mentioned, or missing before you apply." />
          <section className="role-fit-verdict" aria-label={`Role relevance ${roleFitScore} out of 100`}>
            <div className="role-fit-score"><strong>{roleFitScore}</strong><span>/100</span><small>Role relevance</small></div>
            <div className="role-fit-copy"><p className="eyebrow">Match verdict</p><h3>{roleFitVerdict}</h3><p>Your resume is strongest in <strong>{resumeProfile}</strong>, compared with the target role <strong>{details.targetRole}</strong>.</p></div>
            <div className="transferable-box"><span>Transferable evidence</span>{transferableStrengths.length ? <ul>{transferableStrengths.map((strength) => <li key={strength}>{strength}</li>)}</ul> : <p>No clear transferable role evidence was detected.</p>}</div>
          </section>
          <div className="fit-summary" aria-label="Requirement summary">
            <span className="fit-supported"><strong>{supportedCount}</strong> Supported</span>
            <span className="fit-partial"><strong>{partialCount}</strong> Partial</span>
            <span className="fit-missing"><strong>{missingCount}</strong> Missing</span>
          </div>

          <section className="mismatch-panel">
            <div className="subsection-heading"><div><p className="eyebrow">Mismatch report</p><h3>What does not match the job</h3></div><span>{mismatches.length} gaps found</span></div>
            {mismatches.length ? <div className="mismatch-list">{mismatches.map((item, index) => (
              <article className={`mismatch-item mismatch-${item.impact}`} key={`${item.requirement}-${index}`}>
                <div className="mismatch-number">{String(index + 1).padStart(2, "0")}</div>
                <div className="mismatch-main"><div><span>{item.impact}</span><small>{item.category}</small></div><h4>{item.requirement}</h4><p>{item.reason}</p></div>
                <div className="mismatch-action"><strong>What to do</strong><p>{item.action}</p></div>
              </article>
            ))}</div> : <div className="match-complete"><span>✓</span><p>No material requirement mismatch was found. Keep the strongest evidence near the top of the resume.</p></div>}
          </section>

          {details.requirementEvidence.length > 0 ? (
            <div className="requirement-list">
              {details.requirementEvidence.map((item) => (
                <article className={`requirement-card requirement-${item.status}`} key={item.requirement}>
                  <header><div><span>{item.status}</span><small>{item.importance ?? "supporting"} · {item.category ?? "skill"}</small><h3>{item.requirement}</h3></div><strong>{item.score}<small>/100</small></strong></header>
                  <div className="requirement-body">
                    <div><b>{item.evidence.length ? "Evidence found" : "Evidence gap"}</b>{item.evidence.length ? item.evidence.map((evidence) => <q key={evidence}>{evidence}</q>) : <p>No direct proof was found in the resume.</p>}</div>
                    <div><b>Recommended change</b><p>{item.guidance}</p></div>
                  </div>
                </article>
              ))}
            </div>
          ) : <div className="report-card"><p className="empty-copy">Re-upload this resume to generate requirement-level evidence.</p></div>}

          <details className="keyword-drawer">
            <summary>View detailed keyword coverage <span>{analysis.matchedKeywords.length} matched · {analysis.missingKeywords.length} gaps</span></summary>
            <div className="analysis-columns keyword-columns">
              <section><h3>Matched language</h3><div className="keyword-list keyword-list-matched">{analysis.matchedKeywords.length ? analysis.matchedKeywords.map((keyword) => <span key={keyword}>{keyword}</span>) : <p className="empty-copy">No strong matches yet.</p>}</div></section>
              <section><h3>Potential gaps</h3><div className="keyword-list">{analysis.missingKeywords.length ? analysis.missingKeywords.map((keyword) => <span key={keyword}>{keyword}</span>) : <p className="empty-copy">No major gaps found.</p>}</div></section>
            </div>
          </details>
        </section>
      )}

      <section className="report-chapter" id="resume-quality">
        <ChapterHeading number={analysis.mode === "job_match" ? "03" : "02"} eyebrow="Resume quality" title="Structure and writing quality" copy="Review section health first, then open only the bullets that need your attention." />

        <section className="section-audit section-audit-v2" aria-label="Resume section audit">
          {sections.map((section) => (
            <article className={`section-audit-card section-${section.status}`} key={section.name}>
              <div className="section-audit-top"><div><span className="section-state">{section.status}</span><h3>{section.name}</h3></div><strong>{section.score}<small>/100</small></strong></div>
              <p>{section.feedback}</p><ul>{section.checks.map((check) => <li key={check}>{check}</li>)}</ul>
            </article>
          ))}
        </section>

        <section className="diagnostics-card diagnostics-card-v2">
          <div><p className="eyebrow">Resume diagnostics</p><h2>Writing signals</h2></div>
          <div className="diagnostics-grid">{diagnostics.map(([value, label]) => <span key={label}><strong>{value}</strong>{label}</span>)}</div>
        </section>

        {details.bulletInsights.length > 0 && (
          <div className="quality-block">
            <div className="subsection-heading"><div><p className="eyebrow">Bullet-level coaching</p><h3>Open a bullet to see the coaching</h3></div><span>{details.bulletInsights.length} bullets reviewed</span></div>
            <div className="bullet-review-list">
              {details.bulletInsights.map((bullet, index) => (
                <details className="bullet-review" key={`${bullet.text}-${index}`} open={index === 0}>
                  <summary><span className={`bullet-score-pill ${bullet.score >= 75 ? "score-good" : bullet.score >= 50 ? "score-mid" : "score-low"}`}>{bullet.score}</span><p>“{bullet.text}”</p><i aria-hidden="true">⌄</i></summary>
                  <div className="bullet-review-body">
                    <div className="bullet-signals">{bullet.signals.map((signal) => <span key={signal}>✓ {signal}</span>)}{!bullet.signals.length && <span className="bullet-signal-risk">No strong impact signals detected</span>}</div>
                    <p className="bullet-issue">{bullet.issue}</p>
                    <div className="bullet-guidance"><strong>Coach’s note</strong><p>{bullet.guidance}</p></div>
                  </div>
                </details>
              ))}
            </div>
          </div>
        )}

        {details.riskFlags.length > 0 && (
          <div className="quality-block risk-block">
            <div className="subsection-heading"><div><p className="eyebrow">Risk scan</p><h3>Shortlist confidence risks</h3></div></div>
            <div className="risk-list">{details.riskFlags.map((risk) => <article key={risk.title}><span className={`risk-dot risk-${risk.severity}`} /><div><strong>{risk.title}</strong><p>{risk.detail}</p></div></article>)}</div>
          </div>
        )}
      </section>

      <section className="report-chapter" id="action-plan">
        <ChapterHeading number={analysis.mode === "job_match" ? "04" : "03"} eyebrow="Action plan" title="Make these changes next" copy="Work from top to bottom—the highest-impact fixes are shown first." />
        <section className="action-plan">
          {analysis.recommendations.length ? analysis.recommendations.map((item, index) => (
            <article className="action-card" key={item.id}>
              <div className="action-index">{String(index + 1).padStart(2, "0")}</div>
              <div className="action-main"><div className="action-title-row"><span className={`priority priority-${item.priority}`}>{item.priority}</span><span className="action-category">{item.category}</span></div><h3>{item.title}</h3><p>{item.detail}</p>
                {(item.why || item.example) && <div className="action-evidence">{item.why && <div><strong>Why it matters</strong><span>{item.why}</span></div>}{item.example && <div><strong>Try this</strong><span>{item.example}</span></div>}</div>}
              </div>
            </article>
          )) : <div className="report-card"><p className="empty-copy">No priority actions were found. Tailor the resume for each role before applying.</p></div>}
        </section>
      </section>
    </div>
  );
}
