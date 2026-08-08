import Link from "next/link";

export const metadata = { title: "Privacy Policy — ResumeLens", description: "How ResumeLens collects, protects, retains and deletes resume data." };

export default function PrivacyPage() {
  return <main className="legal-page">
    <header className="legal-header"><Link className="app-brand" href="/"><span className="app-brand-mark">◎</span>ResumeLens</Link><Link href="/">Back to home</Link></header>
    <article className="legal-shell">
      <p className="eyebrow">Effective 4 August 2026</p><h1>Privacy Policy</h1><p className="legal-lead">ResumeLens is designed to analyze resumes without selling, advertising against or unnecessarily sharing career data.</p>
      <section><h2>Information we process</h2><p>When you sign in, the authentication provider supplies your email address and may supply your display name. When you create a report, we process the resume file, extracted resume text, optional job description, analysis results, filename, file type, file size and timestamps.</p></section>
      <section><h2>How the information is used</h2><p>Your information is used only to authenticate you, produce the requested ATS analysis, save private reports, let you download or delete your resume and protect the service from abuse.</p></section>
      <section><h2>Storage and retention</h2><p>Original files are stored in private object storage and report data is stored in the application database. New reports expire 30 days after creation. Reports created before this retention policy remain available until you delete them. Expired reports become inaccessible and their stored files are removed through the service cleanup process.</p></section>
      <section><h2>AI and third parties</h2><p>The current scoring engine runs within ResumeLens and does not send resume text to an external AI model. Authentication and hosting providers process the minimum information required to operate the service.</p></section>
      <section><h2>Security</h2><p>Protected routes require sign-in, every report query checks the authenticated owner, uploads are type-, signature-, size-, page- and time-limited, and downloads use private no-store responses. No internet service can guarantee absolute security.</p></section>
      <section><h2>Your choices</h2><p>You can delete an individual report and its original file from the report page. You can permanently delete all reports and resume files from the dashboard’s Privacy and data controls.</p></section>
      <section><h2>Policy changes</h2><p>Material changes will be reflected by an updated effective date on this page. Continued use after an update means the revised policy applies to future processing.</p></section>
      <div className="legal-actions"><Link href="/terms">Read Terms of Use</Link><Link href="/dashboard">Open dashboard</Link></div>
    </article>
  </main>;
}
