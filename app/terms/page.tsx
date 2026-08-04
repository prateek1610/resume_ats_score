import Link from "next/link";

export const metadata = { title: "Terms of Use — ResumeLens", description: "Terms governing use of the ResumeLens ATS analysis service." };

export default function TermsPage() {
  return <main className="legal-page">
    <header className="legal-header"><Link className="app-brand" href="/"><span className="app-brand-mark">◎</span>ResumeLens</Link><Link href="/">Back to home</Link></header>
    <article className="legal-shell">
      <p className="eyebrow">Effective 4 August 2026</p><h1>Terms of Use</h1><p className="legal-lead">ResumeLens provides practical resume feedback. It does not represent an employer, recruiter or applicant tracking system.</p>
      <section><h2>Eligibility and accounts</h2><p>You must use your own authenticated account and provide information you are authorized to upload. You are responsible for activity performed through your account.</p></section>
      <section><h2>Permitted use</h2><p>You may use ResumeLens to analyze resumes and job descriptions for legitimate personal or professional purposes. Do not upload malware, impersonate another person, probe the service, bypass quotas or use automated traffic that harms availability.</p></section>
      <section><h2>Free-plan limits</h2><p>The public MVP allows up to 10 saved analyses per rolling 24-hour period and applies short-term burst limits. Limits may change to maintain service quality and control operating costs.</p></section>
      <section><h2>Accuracy and employment decisions</h2><p>Scores and recommendations are heuristic guidance. Different employers and ATS products may interpret a resume differently. ResumeLens does not guarantee interviews, selection, employment or any particular ranking.</p></section>
      <section><h2>Your content</h2><p>You retain ownership of your resume and job-description content. You grant ResumeLens permission to process and store it only as needed to provide the requested service and maintain your saved reports.</p></section>
      <section><h2>Availability</h2><p>The service may be updated, rate-limited or temporarily unavailable. We may remove abusive content or restrict access where necessary to protect users and infrastructure.</p></section>
      <section><h2>Deletion and termination</h2><p>You can delete individual reports or all account-associated data. ResumeLens may block abusive use, but will not intentionally prevent you from using the available deletion controls.</p></section>
      <div className="legal-actions"><Link href="/privacy">Read Privacy Policy</Link><Link href="/dashboard">Open dashboard</Link></div>
    </article>
  </main>;
}
