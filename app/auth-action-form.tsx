"use client";

import { useState, type FormEvent } from "react";

export function RecoveryForm({ returnTo }: { returnTo: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <form className="auth-fields" action="/auth/recovery" method="post" onSubmit={() => setBusy(true)}>
      <input type="hidden" name="returnTo" value={returnTo} />
      <label><span>Email address</span><input name="email" type="email" inputMode="email" autoComplete="email" maxLength={254} required placeholder="you@example.com" /></label>
      <p className="auth-field-hint">If an account exists for this email, we’ll send a time-limited reset link.</p>
      <button className="auth-submit-button" type="submit" disabled={busy}>{busy ? "Sending reset link…" : "Send password reset link"}</button>
    </form>
  );
}

export function UpdatePasswordForm({ returnTo }: { returnTo: string }) {
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    const form = new FormData(event.currentTarget);
    if (form.get("password") !== form.get("confirmPassword")) {
      event.preventDefault();
      setError("Passwords do not match.");
      return;
    }
    setError(null);
    setBusy(true);
  }

  return (
    <form className="auth-fields" action="/auth/password-update" method="post" onSubmit={submit}>
      <input type="hidden" name="returnTo" value={returnTo} />
      <div className="auth-field-group"><label htmlFor="new-password"><span>New password</span></label><span className="password-field"><input id="new-password" name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={12} maxLength={128} required placeholder="At least 12 characters" /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((value) => !value)}>{showPassword ? "Hide" : "Show"}</button></span></div>
      <label><span>Confirm new password</span><input name="confirmPassword" type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={12} maxLength={128} required placeholder="Repeat your new password" /></label>
      <p className="auth-field-hint">Use a unique 12–128 character passphrase. Updating it signs out other active sessions.</p>
      {error && <p className="auth-inline-error" role="alert">{error}</p>}
      <button className="auth-submit-button" type="submit" disabled={busy}>{busy ? "Updating password…" : "Update password"}</button>
    </form>
  );
}
