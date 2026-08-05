import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/app/auth-form";
import { getAppUser } from "@/lib/app-auth";
import { isSupabaseAuthConfigured } from "@/lib/auth/config";
import { chatGPTSignInPath, resumeLensLoginPath, resumeLensSignupPath, safeRelativeReturnPath } from "@/lib/auth-paths";

type AuthMode = "login" | "signup";
type AuthSearchParams = { return_to?: string | string[]; error?: string | string[]; success?: string | string[] };

const errorMessages: Record<string, string> = {
  blocked: "That request was blocked for your protection. Refresh this page and try again.",
  invalid_input: "Check the highlighted details. Passwords must match and use at least 12 characters.",
  invalid_email: "Enter a valid email address.",
  invalid_credentials: "The email or password is incorrect. You can also request a secure email link.",
  email_not_confirmed: "Verify your email before signing in. Check your inbox for the confirmation link.",
  rate_limited: "Too many attempts. Wait a few minutes before trying again.",
  oauth_unavailable: "Google sign-in could not start. Please retry or use email.",
  callback_failed: "That sign-in link is invalid or expired. Start again to receive a fresh link.",
  recovery_expired: "That password-reset link has expired. Request a new one.",
  unavailable: "Sign-in is temporarily unavailable. Please retry in a moment.",
  cancelled: "Sign-in was cancelled. Nothing changed—try again when you’re ready.",
  expired: "Your sign-in session expired. Please start again.",
  access_denied: "We couldn’t complete sign-in for this account. Please try again.",
};

const successMessages: Record<string, string> = {
  password_updated: "Password updated successfully. Sign in with your new password.",
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function AuthScreen({ mode, searchParams }: { mode: AuthMode; searchParams: Promise<AuthSearchParams> }) {
  const query = await searchParams;
  const returnTo = safeRelativeReturnPath(firstValue(query.return_to));
  const user = await getAppUser();
  if (user) redirect(returnTo);

  const isSignup = mode === "signup";
  const configured = isSupabaseAuthConfigured();
  const errorCode = firstValue(query.error);
  const successCode = firstValue(query.success);
  const errorMessage = errorCode ? (errorMessages[errorCode] ?? "We couldn’t complete sign-in. Please try again safely.") : null;
  const successMessage = successCode ? successMessages[successCode] : null;
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
          <p>Choose the sign-in method that works for you. Every verified method returns you to the same private workspace.</p>

          <div className="auth-benefits">
            <article><span>01</span><div><strong>One consistent account</strong><p>Google, password and email-link access all use your verified email identity.</p></div></article>
            <article><span>02</span><div><strong>Protected sessions</strong><p>Secure, HTTP-only session cookies are validated by the authentication provider.</p></div></article>
            <article><span>03</span><div><strong>Safe return</strong><p>After sign-in, you return directly to the ResumeLens page you requested.</p></div></article>
          </div>
        </section>

        <section className="auth-card" aria-labelledby="auth-card-title">
          <div className="auth-card-brand"><span>◎</span><small>ResumeLens account</small></div>
          <p className="eyebrow">{isSignup ? "Create your account" : "Welcome back"}</p>
          <h2 id="auth-card-title">{isSignup ? "Start analyzing for free" : "Sign in to continue"}</h2>
          <p className="auth-card-copy">{isSignup ? "Create one secure workspace for your saved resumes and reports." : "Access your saved resume analyses and continue where you left off."}</p>

          {errorMessage && <div className="auth-alert" role="alert"><span>!</span><p>{errorMessage}</p></div>}
          {successMessage && <div className="auth-alert auth-alert-success" role="status"><span>✓</span><p>{successMessage}</p></div>}

          {configured ? (
            <AuthForm mode={mode} returnTo={returnTo} />
          ) : (
            <>
              <a className="auth-primary-button" href={chatGPTSignInPath(returnTo)}>
                <span className="auth-provider-icon" aria-hidden="true">✦</span>
                {isSignup ? "Create account with ChatGPT" : "Continue with ChatGPT"}
                <span aria-hidden="true">→</span>
              </a>
              <div className="auth-security-note"><span aria-hidden="true">⌁</span><p>Secure account access is active. Google and email methods appear after the public auth provider is configured.</p></div>
            </>
          )}

          <div className="auth-switch">
            <span>{isSignup ? "Already have a ResumeLens account?" : "New to ResumeLens?"}</span>
            <Link href={alternateHref}>{isSignup ? "Sign in" : "Create free account"}</Link>
          </div>

          <p className="auth-legal">By continuing, you agree to the <Link href="/terms">Terms</Link> and acknowledge the <Link href="/privacy">Privacy Policy</Link>.</p>
        </section>
      </div>
    </main>
  );
}
