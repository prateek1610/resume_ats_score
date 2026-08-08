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
            <span className="password-field"><input id="auth-password" name="password" type={showPassword ? "text" : "password"} autoComplete={isSignup ? "new-password" : "current-password"} minLength={isSignup ? 15 : 1} maxLength={128} required placeholder={isSignup ? "At least 15 characters" : "Your password"} /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((value) => !value)}>{showPassword ? "Hide" : "Show"}</button></span>
          </div>
          {isSignup && <label><span>Confirm password</span><input name="confirmPassword" type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={15} maxLength={128} required placeholder="Repeat your password" /></label>}
          {isSignup && <p className="auth-field-hint">Use 15–128 characters. A long, unique passphrase is easiest to remember and hardest to guess.</p>}
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

      <div className="auth-security-note"><span aria-hidden="true">⌁</span><p>Your session uses secure, HTTP-only cookies. ResumeLens never stores your email password.</p></div>
    </div>
  );
}
