import { getChatGPTUser } from "./chatgpt-auth";
import { resumeLensLoginPath, resumeLensSignupPath } from "@/lib/auth-paths";

export const dynamic = "force-dynamic";

const scoreRows = [
  { label: "Keyword match", score: 78 },
  { label: "Structure", score: 85 },
  { label: "Impact", score: 83 },
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
          <strong>Improve your keyword match</strong>
          <small>Add 6–8 missing skills from the job description.</small>
        </span>
        <span className="insight-arrow" aria-hidden="true">›</span>
      </div>
    </div>
  );
}

export default async function Home() {
  const user = await getChatGPTUser();
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
          <p className="eyebrow">Resume intelligence</p>
          <h1>Know what recruiters’ systems see.</h1>
          <p className="hero-description">
            Upload your resume for a deep ATS review, or add a job description
            to see role relevance, evidence gaps and line-level rewrites.
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href={dashboardHref}>
              <span className="upload-symbol" aria-hidden="true">↑</span>
              Upload resume
            </a>
            <a className="button button-secondary" href={sampleHref}>
              Try with sample
            </a>
          </div>
          <p className="trust-line">10 free analyses/day <span>•</span> Private files <span>•</span> 30-day retention</p>
        </div>
        <ScoreCard />
      </section>

      <section className="proof-strip" aria-label="Product highlights">
        <span><strong>2 modes</strong> Resume or job match</span>
        <span><strong>10/day</strong> Free public beta</span>
        <span><strong>Actionable</strong> Prioritized fixes</span>
        <span><strong>Saved</strong> Reports and history</span>
      </section>

      <section className="content-section" id="how-it-works">
        <div className="section-heading">
          <p className="eyebrow">How it works</p>
          <h2>From file to focused action plan.</h2>
          <p>No vague advice. Every score maps to a clear improvement.</p>
        </div>
        <div className="step-grid">
          <article>
            <span className="step-number">01</span>
            <h3>Upload your resume</h3>
            <p>Choose a PDF or DOCX. We validate the file before analysis.</p>
          </article>
          <article>
            <span className="step-number">02</span>
            <h3>Add a target role</h3>
            <p>Paste a job description for keyword and skills matching, or skip it.</p>
          </article>
          <article>
            <span className="step-number">03</span>
            <h3>Improve with confidence</h3>
            <p>Review your score, missing keywords, section health, and top fixes.</p>
          </article>
        </div>
      </section>

      <section className="content-section features-section" id="features">
        <div className="section-heading">
          <p className="eyebrow">What gets measured</p>
          <h2>A transparent score, not a mystery number.</h2>
        </div>
        <div className="feature-grid">
          <article><span>⌁</span><h3>Keyword match</h3><p>Role-specific terms, hard skills, and relevant tools.</p></article>
          <article><span>≡</span><h3>ATS structure</h3><p>Readable sections, contact details, dates, and formatting.</p></article>
          <article><span>↗</span><h3>Impact language</h3><p>Strong action verbs, measurable outcomes, and clarity.</p></article>
          <article><span>✓</span><h3>Essentials check</h3><p>Core resume signals recruiters expect to find quickly.</p></article>
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
        <h2>Make your next application stronger.</h2>
        <a className="button button-primary" href={dashboardHref}>Analyze my resume</a>
      </section>

      <footer>
        <Brand />
        <p>ATS guidance for better applications—not a hiring guarantee.</p>
        <div className="footer-links"><a href="/privacy">Privacy</a><a href="/terms">Terms</a><span>© 2026 ResumeLens</span></div>
      </footer>
    </main>
  );
}
