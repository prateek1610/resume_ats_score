"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { forgotPasswordPath } from "@/lib/auth-paths";

type AuthMode = "login" | "signup";
type AuthMethod = "password" | "magic";

export function AuthForm({ mode, returnTo }: { mode: AuthMode; returnTo: string }) {
  const [method, setMethod] = useState<AuthMethod>("password");
  const [busy, setBusy] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const isSignup = mode === "signup";

  function startSubmit(name: string) {
    setClientError(null);
    setBusy(name);
  }

  function validatePassword(event: FormEvent<HTMLFormElement>) {
    const form = new FormData(event.currentTarget);
    if (isSignup && form.get("password") !== form.get("confirmPassword")) {
      event.preventDefault();
      setClientError("Passwords do not match.");
      return;
    }
    startSubmit("password");
  }

  return (
    <div className="auth-form-stack">
      <form action="/auth/google" method="post" onSubmit={() => startSubmit("google")}>
        <input type="hidden" name="returnTo" value={returnTo} />
        <button className="auth-google-button" type="submit" disabled={busy !== null}>
          <GoogleIcon />
          <span>{busy === "google" ? "Connecting to Google…" : "Continue with Google"}</span>
        </button>
      </form>

      <div className="auth-divider"><span>or continue with email</span></div>

      <div className="auth-method-tabs" role="group" aria-label="Email sign-in method">
        <button type="button" aria-pressed={method === "password"} onClick={() => { setMethod("password"); setClientError(null); }}>Password</button>
        <button type="button" aria-pressed={method === "magic"} onClick={() => { setMethod("magic"); setClientError(null); }}>Email link</button>
      </div>

      {method === "password" ? (
        <form className="auth-fields" action={`/auth/password?intent=${mode}`} method="post" onSubmit={validatePassword}>
          <input type="hidden" name="returnTo" value={returnTo} />
          {isSignup && (
            <label><span>Full name</span><input name="fullName" type="text" autoComplete="name" minLength={2} maxLength={80} required placeholder="Your full name" /></label>
          )}
          <label><span>Email address</span><input name="email" type="email" inputMode="email" autoComplete="email" maxLength={254} required placeholder="you@example.com" /></label>
          <div className="auth-field-group">
            <label htmlFor="auth-password"><span className="auth-label-row">Password {!isSignup && <Link href={forgotPasswordPath(returnTo)}>Forgot password?</Link>}</span></label>
            <span className="password-field"><input id="auth-password" name="password" type={showPassword ? "text" : "password"} autoComplete={isSignup ? "new-password" : "current-password"} minLength={isSignup ? 12 : 1} maxLength={128} required placeholder={isSignup ? "At least 12 characters" : "Your password"} /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((value) => !value)}>{showPassword ? "Hide" : "Show"}</button></span>
          </div>
          {isSignup && <label><span>Confirm password</span><input name="confirmPassword" type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={12} maxLength={128} required placeholder="Repeat your password" /></label>}
          {isSignup && <p className="auth-field-hint">Use 12–128 characters. A long, unique passphrase is easiest to remember and hardest to guess.</p>}
          {clientError && <p className="auth-inline-error" role="alert">{clientError}</p>}
          <button className="auth-submit-button" type="submit" disabled={busy !== null}>{busy === "password" ? (isSignup ? "Creating account…" : "Signing in…") : (isSignup ? "Create account" : "Sign in")}</button>
        </form>
      ) : (
        <form className="auth-fields" action="/auth/magic-link" method="post" onSubmit={() => startSubmit("magic")}>
          <input type="hidden" name="returnTo" value={returnTo} />
          <input type="hidden" name="intent" value={mode} />
          <label><span>Email address</span><input name="email" type="email" inputMode="email" autoComplete="email" maxLength={254} required placeholder="you@example.com" /></label>
          <p className="auth-field-hint">We’ll send a one-time secure link. It expires and can only be used to access your account.</p>
          <button className="auth-submit-button" type="submit" disabled={busy !== null}>{busy === "magic" ? "Sending secure link…" : (isSignup ? "Create account with email link" : "Email me a sign-in link")}</button>
        </form>
      )}

      <div className="auth-security-note"><span aria-hidden="true">⌁</span><p>Your session is encrypted and stored in secure cookies. ResumeLens never stores your Google or email password.</p></div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20">
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.98-.9 6.63-2.36l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.39 13.93A6.02 6.02 0 0 1 6.08 12c0-.67.11-1.32.31-1.93V7.45H3.04A10 10 0 0 0 2 12c0 1.63.39 3.17 1.04 4.55l3.35-2.62Z" />
      <path fill="#EA4335" d="M12 5.94c1.47 0 2.79.51 3.83 1.5l2.87-2.88A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z" />
    </svg>
  );
}
