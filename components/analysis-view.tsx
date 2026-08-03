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
  return { title: "Needs a focused rewrite", copy: "The report found foundational gaps that may prevent your strongest experience from being seen." };
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

export function AnalysisView({ analysis, compact = false }: AnalysisViewProps) {
  const verdict = scoreVerdict(analysis.overallScore);
  const highPriority = analysis.recommendations.filter((item) => item.priority === "high").length;
  const strongSections = analysis.sections.filter((section) => section.status === "strong").length;
  const sections = analysis.sections.map(normalizeSection);
  const diagnostics = [
    [analysis.stats.wordCount, "Words"],
    [analysis.stats.bulletCount, "Bullets"],
    [analysis.stats.metricCount, "Metrics"],
    [analysis.stats.actionVerbCount, "Action verbs"],
    [analysis.stats.weakPhraseCount ?? 0, "Weak phrases"],
    [analysis.stats.longBulletCount ?? 0, "Long bullets"],
  ];

  return (
    <div className={`analysis-view${compact ? " analysis-view-compact" : ""}`}>
      <section className="analysis-score-panel">
        <div
          className="analysis-score-ring"
          style={{ "--score": analysis.overallScore } as React.CSSProperties}
          aria-label={`ATS score ${analysis.overallScore} out of 100`}
        >
          <span>{analysis.overallScore}</span>
          <small>/100</small>
        </div>
        <div className="analysis-score-copy">
          <p className="eyebrow">Resume readiness</p>
          <h2>{verdict.title}</h2>
          <p>{verdict.copy} {analysis.mode === "job_match" ? "This review includes the supplied job description." : "This is a standalone ATS-readiness review."}</p>
          <div className="analysis-kpis" aria-label="Report highlights">
            <span><strong>{analysis.strengths.length}</strong> positive signals</span>
            <span><strong>{highPriority}</strong> priority fixes</span>
            <span><strong>{strongSections}</strong> strong sections</span>
          </div>
        </div>
      </section>

      <section className="analysis-metrics" aria-label="Score breakdown">
        {(Object.keys(metricLabels) as Array<keyof typeof metricLabels>).map((key) => (
          <div className="analysis-metric" key={key}>
            <span>{metricLabels[key]}</span>
            <div><i style={{ width: `${analysis[key]}%` }} /></div>
            <strong>{analysis[key]}</strong>
          </div>
        ))}
      </section>

      <section className="report-section-heading">
        <div><p className="eyebrow">Executive review</p><h2>What helps—and what holds you back</h2></div>
        <p>A recruiter-style summary of the signals with the biggest effect on your resume.</p>
      </section>

      <div className="analysis-columns analysis-snapshot">
        <section className="report-card report-card-positive">
          <div className="report-card-title"><span className="card-icon card-icon-good">✓</span><div><p className="eyebrow">Good points</p><h3>What is already working</h3></div></div>
          <ul className="strength-list">
            {analysis.strengths.map((strength) => <li key={strength}>{strength}</li>)}
          </ul>
        </section>

        <section className="report-card report-card-focus">
          <div className="report-card-title"><span className="card-icon card-icon-warn">!</span><div><p className="eyebrow">Improvement points</p><h3>Fix these first</h3></div></div>
          <div className="focus-list">
            {analysis.recommendations.slice(0, 4).map((item, index) => (
              <article key={item.id}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div><strong>{item.title}</strong><p>{item.detail}</p></div>
              </article>
            ))}
            {!analysis.recommendations.length && <p className="empty-copy">No critical issues were found.</p>}
          </div>
        </section>
      </div>

      <section className="report-section-heading">
        <div><p className="eyebrow">Section intelligence</p><h2>How each part performs</h2></div>
        <p>Recognition, quality and evidence checks for the sections recruiters scan first.</p>
      </section>

      <section className="section-audit" aria-label="Resume section audit">
        {sections.map((section) => (
          <article className={`section-audit-card section-${section.status}`} key={section.name}>
            <div className="section-audit-top">
              <div><span className="section-state">{section.status}</span><h3>{section.name}</h3></div>
              <strong>{section.score}<small>/100</small></strong>
            </div>
            <p>{section.feedback}</p>
            <ul>{section.checks.map((check) => <li key={check}>{check}</li>)}</ul>
          </article>
        ))}
      </section>

      <section className="report-section-heading">
        <div><p className="eyebrow">Prioritized action plan</p><h2>Specific changes to make next</h2></div>
        <p>Every recommendation explains why it matters and shows how to improve it.</p>
      </section>

      <section className="action-plan">
        {analysis.recommendations.length ? analysis.recommendations.map((item, index) => (
          <article className="action-card" key={item.id}>
            <div className="action-index">{String(index + 1).padStart(2, "0")}</div>
            <div className="action-main">
              <div className="action-title-row"><span className={`priority priority-${item.priority}`}>{item.priority}</span><span className="action-category">{item.category}</span></div>
              <h3>{item.title}</h3>
              <p>{item.detail}</p>
              {(item.why || item.example) && (
                <div className="action-evidence">
                  {item.why && <div><strong>Why it matters</strong><span>{item.why}</span></div>}
                  {item.example && <div><strong>Try this</strong><span>{item.example}</span></div>}
                </div>
              )}
            </div>
          </article>
        )) : <div className="report-card"><p className="empty-copy">No priority actions were found. Tailor the resume for each role before applying.</p></div>}
      </section>

      {analysis.mode === "job_match" && (
        <>
          <section className="report-section-heading">
            <div><p className="eyebrow">Job alignment</p><h2>Keyword coverage</h2></div>
            <p>Use missing terms only when your real experience supports them.</p>
          </section>
          <div className="analysis-columns keyword-columns">
            <section className="report-card keyword-card keyword-card-good">
              <div className="keyword-card-heading"><div><p className="eyebrow">Matched</p><h3>Evidence already found</h3></div><strong>{analysis.matchedKeywords.length}</strong></div>
              <div className="keyword-list keyword-list-matched">
                {analysis.matchedKeywords.length ? analysis.matchedKeywords.map((keyword) => <span key={keyword}>{keyword}</span>) : <p className="empty-copy">No strong keyword matches yet.</p>}
              </div>
            </section>
            <section className="report-card keyword-card keyword-card-gap">
              <div className="keyword-card-heading"><div><p className="eyebrow">Missing</p><h3>Potential relevance gaps</h3></div><strong>{analysis.missingKeywords.length}</strong></div>
              <div className="keyword-list">
                {analysis.missingKeywords.length ? analysis.missingKeywords.map((keyword) => <span key={keyword}>{keyword}</span>) : <p className="empty-copy">No major keyword gaps found.</p>}
              </div>
            </section>
          </div>
        </>
      )}

      <section className="diagnostics-card">
        <div><p className="eyebrow">Resume diagnostics</p><h2>The details behind your score</h2></div>
        <div className="diagnostics-grid">
          {diagnostics.map(([value, label]) => <span key={label}><strong>{value}</strong>{label}</span>)}
        </div>
      </section>
    </div>
  );
}
