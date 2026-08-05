import Link from "next/link";
import type { ReactNode } from "react";

export function AuthShell({ children, heading, copy }: { children: ReactNode; heading: string; copy: string }) {
  return (
    <main className="auth-page auth-page-compact">
      <header className="auth-header">
        <Link className="app-brand" href="/"><span className="app-brand-mark">◎</span>ResumeLens</Link>
        <Link href="/" className="auth-back">← Back to home</Link>
      </header>
      <div className="auth-status-wrap">
        <section className="auth-card auth-status-card" aria-labelledby="auth-status-title">
          <div className="auth-card-brand"><span>◎</span><small>ResumeLens account</small></div>
          <p className="eyebrow">Secure account access</p>
          <h1 id="auth-status-title">{heading}</h1>
          <p className="auth-card-copy">{copy}</p>
          {children}
        </section>
      </div>
    </main>
  );
}
