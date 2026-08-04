import Link from "next/link";
import { redirect } from "next/navigation";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { chatGPTSignInPath, resumeLensLoginPath, resumeLensSignupPath, safeRelativeReturnPath } from "@/lib/auth-paths";

type AuthMode = "login" | "signup";
type AuthSearchParams = { return_to?: string | string[]; error?: string | string[] };

const errorMessages: Record<string, string> = {
  cancelled: "Sign-in was cancelled. Nothing changed—try again when you’re ready.",
  expired: "Your sign-in session expired. Please start again.",
  access_denied: "We couldn’t complete sign-in for this account. Please try again.",
  unavailable: "Sign-in is temporarily unavailable. Please retry in a moment.",
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function AuthScreen({ mode, searchParams }: { mode: AuthMode; searchParams: Promise<AuthSearchParams> }) {
  const query = await searchParams;
  const returnTo = safeRelativeReturnPath(firstValue(query.return_to));
  const user = await getChatGPTUser();
  if (user) redirect(returnTo);

  const isSignup = mode === "signup";
  const errorCode = firstValue(query.error);
  const errorMessage = errorCode ? (errorMessages[errorCode] ?? "We couldn’t complete sign-in. Please try again safely.") : null;
  const alternateHref = isSignup ? resumeLensLoginPath(returnTo) : resumeLensSignupPath(returnTo);

  return (
    <main className="auth-page">
      <header className="auth-header">
        <Link className="app-brand" href="/"><span className="app-brand-mark">◎</span>ResumeLens</Link>
        <Link href="/" className="auth-back">← Back to home</Link>
      </header>

      <div className="auth-layout">
        <section className="auth-intro" aria-labelledby="auth-heading">
          <p className="eyebrow">Secure account access</p>
          <h1 id="auth-heading">Your resume workspace, protected.</h1>
          <p>Sign in once to analyze resumes, save reports, download files and continue exactly where you left off.</p>

          <div className="auth-benefits">
            <article><span>01</span><div><strong>Private by default</strong><p>Every resume and report is linked only to your signed-in account.</p></div></article>
            <article><span>02</span><div><strong>No extra password</strong><p>Authentication is handled by ChatGPT. ResumeLens never receives your password.</p></div></article>
            <article><span>03</span><div><strong>Safe return</strong><p>After sign-in, you return directly to the page you originally requested.</p></div></article>
          </div>
        </section>

        <section className="auth-card" aria-labelledby="auth-card-title">
          <div className="auth-card-brand"><span>◎</span><small>ResumeLens account</small></div>
          <p className="eyebrow">{isSignup ? "Create your account" : "Welcome back"}</p>
          <h2 id="auth-card-title">{isSignup ? "Start analyzing for free" : "Sign in to continue"}</h2>
          <p className="auth-card-copy">{isSignup ? "Use your ChatGPT account to create a secure ResumeLens workspace. No separate password is needed." : "Continue securely with the same ChatGPT account you used before."}</p>

          {errorMessage && <div className="auth-alert" role="alert"><span>!</span><p>{errorMessage}</p></div>}

          <a className="auth-primary-button" href={chatGPTSignInPath(returnTo)}>
            <span className="auth-provider-icon" aria-hidden="true">✦</span>
            {isSignup ? "Create account with ChatGPT" : "Continue with ChatGPT"}
            <span aria-hidden="true">→</span>
          </a>

          <div className="auth-security-note"><span aria-hidden="true">⌁</span><p>Secure single sign-on. Your ChatGPT credentials are never shared with ResumeLens.</p></div>

          <div className="auth-switch">
            <span>{isSignup ? "Already have a ResumeLens workspace?" : "New to ResumeLens?"}</span>
            <Link href={alternateHref}>{isSignup ? "Sign in" : "Create free account"}</Link>
          </div>

          <p className="auth-help">Having trouble? Go back and retry—your uploaded data is never exposed during sign-in.</p>
        </section>
      </div>
    </main>
  );
}
