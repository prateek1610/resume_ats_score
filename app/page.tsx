import { getAppUser } from "@/lib/app-auth";
import { resumeLensLoginPath, resumeLensSignupPath } from "@/lib/auth-paths";

export const dynamic = "force-dynamic";

const scoreRows = [
  { label: "Job relevance", score: 78 },
  { label: "ATS structure", score: 85 },
  { label: "Achievement impact", score: 83 },
];

function Brand() {
  return (
    <span className="brand" aria-label="ResumeLens home">
      <span className="brand-mark" aria-hidden="true">
        <span />
      </span>
      <span>ResumeLens</span>
    </span>
  );
}

function ScoreCard() {
  return (
    <div className="score-card" aria-label="Example ATS score report">
      <div className="score-card-badge"><span>Live report preview</span><small>Example analysis</small></div>
      <div className="score-card-top">
        <div>
          <p className="score-label">ATS score</p>
          <p className="score-value">
            82<span>/100</span>
          </p>
        </div>
        <div className="score-ring" aria-hidden="true">
          <div className="score-ring-inner">82</div>
        </div>
      </div>

      <div className="score-metrics">
        {scoreRows.map((row) => (
          <div className="score-row" key={row.label}>
            <div className="score-row-copy">
              <span>{row.label}</span>
              <strong>
                {row.score}<small>/100</small>
              </strong>
            </div>
            <div className="score-track" aria-hidden="true">
              <span style={{ width: `${row.score}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="insight-card">
        <span className="insight-icon" aria-hidden="true">✦</span>
        <span>
          <strong>3 requirements need stronger evidence</strong>
          <small>See the exact resume lines to improve before you apply.</small>
        </span>
        <span className="insight-arrow" aria-hidden="true">›</span>
      </div>
    </div>
  );
}

export default async function Home() {
  const user = await getAppUser();
  const dashboardHref = user
    ? "/dashboard"
    : resumeLensLoginPath("/dashboard");
  const sampleHref = user
    ? "/dashboard?sample=1"
    : resumeLensLoginPath("/dashboard?sample=1");
  const signupHref = resumeLensSignupPath("/dashboard");

  return (
    <main>
      <header className="site-header">
        <a href="#top" className="brand-link">
          <Brand />
        </a>
        <nav className="main-nav" aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#features">Features</a>
          <a href="#privacy">Privacy</a>
        </nav>
        {user ? <a className="sign-in-link" href={dashboardHref}>Open dashboard</a> : (
          <div className="public-auth-actions"><a className="sign-in-link" href={dashboardHref}>Sign in</a><a className="header-signup" href={signupHref}>Create account</a></div>
        )}
      </header>

      <section className="hero" id="top">
        <div className="hero-glow" aria-hidden="true" />
        <div className="hero-copy">
          <p className="eyebrow">Free ATS resume analysis</p>
          <h1>See what your resume proves—and what it’s missing.</h1>
          <p className="hero-description">
            Get an ATS score you can act on: evidence-based strengths, exact-line
            improvements, rewrite templates and a requirement-by-requirement job match.
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href={dashboardHref}>
              Analyze my resume
              <span className="button-arrow" aria-hidden="true">→</span>
            </a>
            <a className="button button-secondary" href={sampleHref}>
              Preview a full report
            </a>
          </div>
          <div className="trust-line" aria-label="Free plan and privacy highlights">
            <span>✓ 10 free analyses/day</span>
            <span>✓ Private by default</span>
            <span>✓ Delete anytime</span>
          </div>
        </div>
        <ScoreCard />
      </section>

      <section className="proof-strip" aria-label="Product highlights">
        <span><strong>7 dimensions</strong> Complete resume health</span>
        <span><strong>Line-level</strong> Evidence, not generic advice</span>
        <span><strong>Job-fit map</strong> Supported, partial and missing</span>
        <span><strong>Private workspace</strong> Saved reports and files</span>
      </section>

      <section className="content-section" id="how-it-works">
        <div className="section-heading">
          <p className="eyebrow">How it works</p>
          <h2>Three steps from upload to stronger application.</h2>
          <p>Every score leads to evidence you can review and a next action you can take.</p>
        </div>
        <div className="step-grid">
          <article>
            <span className="step-number">01</span>
            <h3>Start with your resume</h3>
            <p>Upload a PDF or DOCX. The file is validated before any analysis begins.</p>
          </article>
          <article>
            <span className="step-number">02</span>
            <h3>Target a job—or stay general</h3>
            <p>Paste a job description for requirement matching, or skip it for a standalone review.</p>
          </article>
          <article>
            <span className="step-number">03</span>
            <h3>Fix what matters first</h3>
            <p>Work through prioritized gaps, exact-line feedback and honest rewrite templates.</p>
          </article>
        </div>
      </section>

      <section className="content-section features-section" id="features">
        <div className="section-heading">
          <p className="eyebrow">What gets measured</p>
          <h2>A complete review, organized for action.</h2>
          <p>Understand both what is working and what could stop a recruiter from seeing your fit.</p>
        </div>
        <div className="feature-grid">
          <article><span>✓</span><h3>Evidence-based strengths</h3><p>See the exact lines that already demonstrate credibility and impact.</p></article>
          <article><span>!</span><h3>Precise improvements</h3><p>Each issue is tied to the section or line that needs attention.</p></article>
          <article><span>→</span><h3>Rewrite templates</h3><p>Turn vague bullets into stronger, tighter statements without inventing facts.</p></article>
          <article><span>⌁</span><h3>Role requirement map</h3><p>Separate supported evidence from partial claims and genuine gaps.</p></article>
        </div>
      </section>

      <section className="privacy-section" id="privacy">
        <div>
          <p className="eyebrow">Privacy by design</p>
          <h2>Your career data stays yours.</h2>
        </div>
        <div className="privacy-copy">
          <p>Reports and original resumes are saved only to your signed-in account. New uploads are retained for 30 days.</p>
          <p>Every data request is authorized on the server, files are private, and you can permanently delete one report or all account-associated data at any time.</p>
        </div>
      </section>

      <section className="final-cta">
        <p className="eyebrow">Ready when you are</p>
        <h2>Know what to fix before you apply.</h2>
        <p>Start with a free analysis. Add a job description whenever you want a targeted match.</p>
        <a className="button button-primary" href={dashboardHref}>Start my free analysis <span aria-hidden="true">→</span></a>
      </section>

      <footer>
        <Brand />
        <p>ATS guidance for better applications—not a hiring guarantee.</p>
        <div className="footer-links"><a href="/privacy">Privacy</a><a href="/terms">Terms</a><span>© 2026 ResumeLens</span></div>
      </footer>
    </main>
  );
}
