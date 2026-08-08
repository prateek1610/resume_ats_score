import type { ResumeAnalysis, SectionInsight } from "@/lib/scoring";
import type { StructuredResume } from "@/lib/structured-resume";
import type { ReportView } from "@/lib/report-view";

type AnalysisViewProps = {
  analysis: ResumeAnalysis;
  compact?: boolean;
  view?: ReportView;
  basePath?: string;
  structuredResume?: StructuredResume | null;
};

const metricLabels = {
  keywordScore: "ATS keyword coverage",
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

function SourceValue({ item }: { item: { value: string; sourceLine: number; confidence: string } | null | undefined }) {
  if (!item) return <span className="parsed-empty">Not detected</span>;
  return <span className="parsed-value">{item.value}<small>Line {item.sourceLine} · {item.confidence}</small></span>;
}

function ParsedResumeView({ resume }: { resume?: StructuredResume | null }) {
  if (!resume) {
    return <div className="parsed-empty-state"><span>◎</span><h3>Structured data is not available for this report</h3><p>Re-upload this resume to generate the ATS parsing preview.</p></div>;
  }

  return (
    <div className="parsed-resume-view">
      <section className="parsed-confidence">
        <div><strong>{resume.extraction.confidence}</strong><span>/100</span><small>Extraction confidence</small></div>
        <div><h3>{resume.extraction.warnings.length ? "Review recommended" : "Resume parsed successfully"}</h3><p>Every value below is linked to the source line used to identify it.</p>{resume.extraction.warnings.length > 0 && <ul>{resume.extraction.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}</div>
      </section>

      <section className="parsed-section">
        <header><span>01</span><div><p className="eyebrow">Identity</p><h3>Contact details</h3></div></header>
        <div className="parsed-contact-grid">
          <article><b>Name</b><SourceValue item={resume.contact.name} /></article>
          <article><b>Email</b>{resume.contact.emails.length ? resume.contact.emails.map((item) => <SourceValue item={item} key={`${item.value}-${item.sourceLine}`} />) : <span className="parsed-empty">Not detected</span>}</article>
          <article><b>Phone</b>{resume.contact.phones.length ? resume.contact.phones.map((item) => <SourceValue item={item} key={`${item.value}-${item.sourceLine}`} />) : <span className="parsed-empty">Not detected</span>}</article>
          <article><b>Location</b><SourceValue item={resume.contact.location} /></article>
          {resume.contact.links.length > 0 && <article className="parsed-contact-links"><b>Profile links</b>{resume.contact.links.map((item) => <SourceValue item={item} key={`${item.value}-${item.sourceLine}`} />)}</article>}
        </div>
      </section>

      <section className="parsed-section">
        <header><span>02</span><div><p className="eyebrow">Positioning</p><h3>Summary and skills</h3></div></header>
        <div className="parsed-summary-grid">
          <article><b>Professional summary</b>{resume.summary ? <blockquote>{resume.summary.text}<small>Lines {resume.summary.sourceLines.join(", ")} · {resume.summary.confidence}</small></blockquote> : <span className="parsed-empty">Not detected</span>}</article>
          <article><b>Skills</b><div className="parsed-skill-list">{resume.skills.length ? resume.skills.map((skill) => <span key={`${skill.value}-${skill.sourceLine}`}>{skill.value}<small>Line {skill.sourceLine}</small></span>) : <span className="parsed-empty">No structured skills detected</span>}</div></article>
        </div>
      </section>

      <section className="parsed-section">
        <header><span>03</span><div><p className="eyebrow">Career history</p><h3>Experience</h3></div></header>
        <div className="parsed-entry-list">{resume.experience.length ? resume.experience.map((entry, index) => <details key={`${entry.title?.value ?? "role"}-${index}`} open={index === 0}>
          <summary><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{entry.title?.value ?? "Role not detected"}</strong><small>{entry.organization?.value ?? "Organization not detected"}{entry.dateRange ? ` · ${entry.dateRange.value}` : ""}</small></div><i>⌄</i></summary>
          <div className="parsed-entry-body">
            <div className="parsed-entry-meta"><span><b>Title</b><SourceValue item={entry.title} /></span><span><b>Organization</b><SourceValue item={entry.organization} /></span><span><b>Dates</b><SourceValue item={entry.dateRange} /></span><span><b>Location</b><SourceValue item={entry.location} /></span></div>
            {entry.bullets.length > 0 && <ul>{entry.bullets.map((bullet) => <li key={bullet.id}>{bullet.text}<small>Line {bullet.sourceLine}</small></li>)}</ul>}
          </div>
        </details>) : <span className="parsed-empty">No structured experience entries detected</span>}</div>
      </section>

      <div className="parsed-lower-grid">
        <section className="parsed-section">
          <header><span>04</span><div><p className="eyebrow">Qualifications</p><h3>Education</h3></div></header>
          <div className="parsed-simple-list">{resume.education.length ? resume.education.map((entry, index) => <article key={`${entry.qualification?.value ?? "education"}-${index}`}><SourceValue item={entry.qualification} /><SourceValue item={entry.institution} /><SourceValue item={entry.dateRange} /></article>) : <span className="parsed-empty">Not detected</span>}</div>
        </section>
        <section className="parsed-section">
          <header><span>05</span><div><p className="eyebrow">Credentials</p><h3>Certifications</h3></div></header>
          <div className="parsed-simple-list">{resume.certifications.length ? resume.certifications.map((entry, index) => <article key={`${entry.name.value}-${index}`}><SourceValue item={entry.name} /><SourceValue item={entry.issuer} /><SourceValue item={entry.date} /></article>) : <span className="parsed-empty">Not detected</span>}</div>
        </section>
      </div>
    </div>
  );
}

export function AnalysisView({ analysis, compact = false, view, basePath = "", structuredResume }: AnalysisViewProps) {
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
    resumeReview: { dimensions: [], strengths: [], areasToImprove: [], suggestedRewrites: [], suggestedAdditions: [], missingElements: [] },
  };
  const sections = analysis.sections.map(normalizeSection);
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
  const review = details.resumeReview ?? {
    dimensions: [],
    strengths: analysis.strengths.map((strength) => ({ dimension: "clarity" as const, title: "Saved report strength", location: "Earlier report", line: strength, explanation: "Re-upload this resume to generate line-level evidence for the newest review format." })),
    areasToImprove: analysis.recommendations.slice(0, 6).map((item) => ({ dimension: item.category === "impact" ? "impact" as const : item.category === "keywords" ? "keywords" as const : "clarity" as const, priority: item.priority, location: "Earlier report", line: item.title, suggestion: item.detail })),
    suggestedRewrites: [],
    suggestedAdditions: [],
    missingElements: sections.map((section) => ({ label: section.name, status: section.present ? "present" as const : "missing" as const, detail: section.feedback })),
  };
  const diagnostics = [
    [analysis.stats.wordCount, "Words"],
    [analysis.stats.bulletCount, "Bullets"],
    [analysis.stats.metricCount, "Metrics"],
    [analysis.stats.actionVerbCount, "Action verbs"],
    [analysis.stats.weakPhraseCount ?? 0, "Weak phrases"],
    [analysis.stats.longBulletCount ?? 0, "Long bullets"],
  ];
  const activeView = view ?? "overview";
  const showAll = compact && view === undefined;
  const showOverview = showAll || activeView === "overview";
  const showJobMatch = showAll || activeView === "job-match";
  const showReview = showAll || activeView === "review";
  const showRewrites = showAll || activeView === "rewrites";
  const showChecklist = showAll || activeView === "checklist";
  const showParsedResume = !showAll && activeView === "parsed-resume";
  const reportLinks = [
    { view: "overview" as const, number: "01", label: "Overview", copy: "Scores and next actions" },
    ...(analysis.mode === "job_match" ? [{ view: "job-match" as const, number: "02", label: "Job Match", copy: "Evidence and keyword gaps" }] : []),
    { view: "review" as const, number: analysis.mode === "job_match" ? "03" : "02", label: "Resume Review", copy: "Strengths and weak areas" },
    { view: "rewrites" as const, number: analysis.mode === "job_match" ? "04" : "03", label: "Rewrites", copy: "Stronger bullet templates" },
    { view: "checklist" as const, number: analysis.mode === "job_match" ? "05" : "04", label: "Missing Elements", copy: "Completeness and diagnostics" },
    { view: "parsed-resume" as const, number: analysis.mode === "job_match" ? "06" : "05", label: "Parsed Resume", copy: "What the ATS detected" },
  ];

  return (
    <div className={`analysis-view analysis-view-v2${compact ? " analysis-view-compact" : ""}`}>
      <section className={`analysis-score-panel analysis-hero${activeView !== "overview" ? " analysis-hero-slim" : ""}`}>
        <div className="analysis-score-ring" style={{ "--score": analysis.overallScore } as React.CSSProperties} aria-label={`ATS score ${analysis.overallScore} out of 100`}>
          <span>{analysis.overallScore}</span><small>/100</small>
        </div>
        <div className="analysis-score-copy">
          <p className="eyebrow">Overall ATS readiness</p>
          <h2>{verdict.title}</h2>
          <p>{verdict.copy} {analysis.mode === "job_match" ? `This review is tailored for ${details.targetRole}.` : "Add a job description for role-specific evidence matching."}</p>
          <div className="analysis-kpis" aria-label="Report highlights">
            <span><strong>{analysis.strengths.length}</strong> strengths</span>
            <span><strong>{analysis.recommendations.length}</strong> recommended actions</span>
            {analysis.mode === "job_match" && <span><strong>{supportedCount}</strong> requirements supported</span>}
          </div>
        </div>
      </section>

      {showAll && <nav className="report-jump-nav" aria-label="Analysis sections">
        <a href="#overview"><span>01</span> Overview</a>
        {analysis.mode === "job_match" && <a href="#role-fit"><span>02</span> Job match</a>}
        <a href="#resume-quality"><span>{analysis.mode === "job_match" ? "03" : "02"}</span> Resume review</a>
        <a href="#action-plan"><span>{analysis.mode === "job_match" ? "04" : "03"}</span> Action plan</a>
      </nav>}

      {showAll && <aside className="report-reading-guide" aria-label="How to use this report">
        <strong>Use this report in order</strong>
        <span><b>1</b> Confirm what already works</span>
        <span><b>2</b> Close evidence gaps truthfully</span>
        <span><b>3</b> Apply the highest-impact rewrites</span>
      </aside>}

      <div className={compact ? "report-workspace-content" : "report-workspace-layout"}>
        {!compact && <nav className="report-section-nav" aria-label="Report sections">
          <div><span>Report workspace</span><small>Review one area at a time</small></div>
          {reportLinks.map((item) => <a href={`${basePath}/${item.view}`} aria-current={activeView === item.view ? "page" : undefined} key={item.view}><b>{item.number}</b><span><strong>{item.label}</strong><small>{item.copy}</small></span><i aria-hidden="true">→</i></a>)}
        </nav>}
        <div className="report-workspace-main">

      {showOverview && <section className="report-chapter" id="overview">
        <ChapterHeading number="01" eyebrow="Overview" title="Your report at a glance" copy="Start with the strongest evidence, the clearest risk and the scores behind the overall result." />

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
      </section>}

      {showJobMatch && analysis.mode === "job_match" && (
        <section className="report-chapter" id="role-fit">
          <ChapterHeading number="02" eyebrow="Job match" title="Job requirements versus resume evidence" copy="See what the resume supports, what it only suggests and what it does not yet prove." />
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
            <div className="subsection-heading"><div><p className="eyebrow">Evidence gap report</p><h3>Requirements your resume does not yet prove</h3><small>Only add evidence you can explain confidently in an interview.</small></div><span>{mismatches.length} gaps found</span></div>
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

      {showReview && <section className="report-chapter" id="resume-quality">
        <ChapterHeading number={analysis.mode === "job_match" ? "03" : "02"} eyebrow="Deep resume review" title="Evidence-based writing analysis" copy="Every finding is tied to the resume. Treat bracketed rewrites as templates and replace placeholders only with facts you can verify." />

        {review.dimensions.length ? <section className="dimension-grid" aria-label="Resume review dimensions">
          {review.dimensions.map((dimension) => <article className={`dimension-card dimension-${dimension.status}`} key={dimension.id}>
            <header><span>{dimension.label}</span><strong>{dimension.score}<small>/100</small></strong></header>
            <div><i style={{ width: `${dimension.score}%` }} /></div><p>{dimension.summary}</p>
          </article>)}
        </section> : <div className="report-card"><p className="empty-copy">This saved report predates the seven-dimension review. Re-upload the resume to generate it.</p></div>}

        <section className="review-section review-strengths" aria-labelledby="strengths-title">
          <header className="review-section-heading"><span>1</span><div><p className="eyebrow">Evidence that works</p><h3 id="strengths-title">Strengths</h3><p>Specific lines that already help recruiter confidence.</p></div></header>
          <div className="cited-strength-grid">{review.strengths.map((item, index) => <article key={`${item.location}-${index}`}>
            <div className="review-meta"><span>{item.dimension.replace("_", " ")}</span><small>{item.location}</small></div><h4>{item.title}</h4><blockquote>“{item.line}”</blockquote><p>{item.explanation}</p>
          </article>)}</div>
        </section>

        <section className="review-section review-improvements" aria-labelledby="improvements-title">
          <header className="review-section-heading"><span>2</span><div><p className="eyebrow">Specific and actionable</p><h3 id="improvements-title">Areas to Improve</h3><p>Each issue points to the exact line or section that needs attention.</p></div></header>
          {review.areasToImprove.length ? <div className="improvement-list">{review.areasToImprove.map((item, index) => <article key={`${item.location}-${item.dimension}-${index}`}>
            <div className="improvement-index">{String(index + 1).padStart(2, "0")}</div><div className="improvement-source"><div className="review-meta"><span className={`priority priority-${item.priority}`}>{item.priority}</span><small>{item.location}</small></div><blockquote>“{item.line}”</blockquote></div><div className="improvement-advice"><strong>{item.dimension.replace("_", " ")}</strong><p>{item.suggestion}</p></div>
          </article>)}</div> : <div className="match-complete"><span>✓</span><p>No material line-level issue was detected. Tailor the strongest bullets for each job.</p></div>}
        </section>
      </section>}

      {showRewrites && <section className="report-chapter" id="rewrites">
        <ChapterHeading number={analysis.mode === "job_match" ? "04" : "03"} eyebrow="Rewrite studio" title="Turn weak lines into stronger evidence" copy="Compare original bullets with tighter templates, then add only details you can verify." />
        <section className="review-section review-rewrites" aria-labelledby="rewrites-title">
          <header className="review-section-heading"><span>1</span><div><p className="eyebrow">Original → rewrite template</p><h3 id="rewrites-title">Suggested Rewrites</h3><p>Stronger verbs, tighter phrasing and honest placeholders. These are templates, not facts to copy blindly.</p></div></header>
          {review.suggestedRewrites.length ? <div className="rewrite-list">{review.suggestedRewrites.map((item, index) => <article className="rewrite-card" key={`${item.location}-${index}`}>
            <header><span>{String(index + 1).padStart(2, "0")}</span><small>{item.location}</small></header><div className="rewrite-comparison"><div><b>Original line</b><p>{item.original}</p></div><span aria-hidden="true">→</span><div><b>Rewrite template</b><p>{item.improved}</p></div></div><footer><strong>Why this is stronger</strong><p>{item.reason}</p></footer>
          </article>)}</div> : <div className="report-card"><p className="empty-copy">No weak bullet was selected for rewriting. Re-upload older reports to generate line-by-line rewrites.</p></div>}
        </section>

        <section className="review-section review-additions" aria-labelledby="additions-title">
          <header className="review-section-heading"><span>2</span><div><p className="eyebrow">Fill important gaps</p><h3 id="additions-title">Sentences You Could Add</h3><p>Use these patterns only when they reflect your real experience.</p></div></header>
          {review.suggestedAdditions.length ? <div className="addition-grid">{review.suggestedAdditions.map((item, index) => <article key={`${item.title}-${index}`}><div><span>Suggested line {String(index + 1).padStart(2, "0")}</span><h4>{item.title}</h4></div><blockquote>{item.text}</blockquote><p>{item.reason}</p></article>)}</div> : <div className="report-card"><p className="empty-copy">Re-upload this resume to generate role-aware sentences you could add.</p></div>}
        </section>
      </section>}

      {showChecklist && <section className="report-chapter" id="checklist">
        <ChapterHeading number={analysis.mode === "job_match" ? "05" : "04"} eyebrow="Completeness" title="Missing elements and technical checks" copy="See which standard resume elements are present, thin or missing, with detailed diagnostics available on demand." />
        <section className="review-section review-checklist" aria-labelledby="checklist-title">
          <header className="review-section-heading"><span>1</span><div><p className="eyebrow">Completeness scan</p><h3 id="checklist-title">Missing Elements Checklist</h3><p>Present, thin and missing resume essentials in one place.</p></div></header>
          <div className="checklist-table">{review.missingElements.map((item) => <article key={item.label}><span className={`check-status check-${item.status}`}>{item.status === "present" ? "✓" : item.status === "thin" ? "!" : "×"}</span><div><strong>{item.label}</strong><p>{item.detail}</p></div><em>{item.status}</em></article>)}</div>
        </section>

        <details className="technical-audit">
          <summary>Open section scores and diagnostic counts <span>{sections.length} sections · {analysis.stats.wordCount} words</span></summary>
          <section className="section-audit section-audit-v2" aria-label="Resume section audit">{sections.map((section) => <article className={`section-audit-card section-${section.status}`} key={section.name}><div className="section-audit-top"><div><span className="section-state">{section.status}</span><h3>{section.name}</h3></div><strong>{section.score}<small>/100</small></strong></div><p>{section.feedback}</p><ul>{section.checks.map((check) => <li key={check}>{check}</li>)}</ul></article>)}</section>
          <section className="diagnostics-card diagnostics-card-v2"><div><p className="eyebrow">Resume diagnostics</p><h2>Writing signals</h2></div><div className="diagnostics-grid">{diagnostics.map(([value, label]) => <span key={label}><strong>{value}</strong>{label}</span>)}</div></section>
        </details>
      </section>}

      {showOverview && <section className="report-chapter" id="action-plan">
        <ChapterHeading number="02" eyebrow="Action plan" title="Make these changes next" copy="Work from top to bottom—the highest-impact fixes are shown first." />
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
      </section>}

      {showParsedResume && <section className="report-chapter" id="parsed-resume">
        <ChapterHeading number={analysis.mode === "job_match" ? "06" : "05"} eyebrow="ATS parsing preview" title="What ResumeLens detected" copy="Confirm that contact details, skills, roles, education and certifications were assigned to the correct sections." />
        <ParsedResumeView resume={structuredResume} />
      </section>}
        </div>
      </div>
    </div>
  );
}
