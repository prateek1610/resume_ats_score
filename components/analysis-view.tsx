import type { ResumeAnalysis } from "@/lib/scoring";

type AnalysisViewProps = {
  analysis: ResumeAnalysis;
  compact?: boolean;
};

const metricLabels = {
  keywordScore: "Keyword match",
  structureScore: "ATS structure",
  impactScore: "Impact",
  essentialsScore: "Essentials",
} as const;

export function AnalysisView({ analysis, compact = false }: AnalysisViewProps) {
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
        <div>
          <p className="eyebrow">Overall ATS score</p>
          <h2>{analysis.overallScore >= 80 ? "Strong foundation" : analysis.overallScore >= 60 ? "Good potential" : "Needs focused work"}</h2>
          <p>{analysis.mode === "job_match" ? "Scored against the supplied job description." : "Scored as a standalone ATS-ready resume."}</p>
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

      <div className="analysis-columns">
        <section className="report-card">
          <p className="eyebrow">Top recommendations</p>
          <div className="recommendation-list">
            {analysis.recommendations.length ? analysis.recommendations.map((item) => (
              <article key={item.id}>
                <span className={`priority priority-${item.priority}`}>{item.priority}</span>
                <div><h3>{item.title}</h3><p>{item.detail}</p></div>
              </article>
            )) : <p className="empty-copy">No critical issues were found.</p>}
          </div>
        </section>

        <section className="report-card">
          <p className="eyebrow">What is working</p>
          <ul className="strength-list">
            {analysis.strengths.map((strength) => <li key={strength}>{strength}</li>)}
          </ul>
          <div className="resume-stats">
            <span><strong>{analysis.stats.wordCount}</strong> words</span>
            <span><strong>{analysis.stats.metricCount}</strong> metrics</span>
            <span><strong>{analysis.stats.sectionCount}</strong> sections</span>
          </div>
        </section>
      </div>

      {analysis.mode === "job_match" && (
        <div className="analysis-columns keyword-columns">
          <section className="report-card">
            <p className="eyebrow">Matched keywords</p>
            <div className="keyword-list keyword-list-matched">
              {analysis.matchedKeywords.length ? analysis.matchedKeywords.map((keyword) => <span key={keyword}>{keyword}</span>) : <p className="empty-copy">No strong keyword matches yet.</p>}
            </div>
          </section>
          <section className="report-card">
            <p className="eyebrow">Missing keywords</p>
            <div className="keyword-list">
              {analysis.missingKeywords.length ? analysis.missingKeywords.map((keyword) => <span key={keyword}>{keyword}</span>) : <p className="empty-copy">No major keyword gaps found.</p>}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
