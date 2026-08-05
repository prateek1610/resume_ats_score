import type { Metadata } from "next";
import Link from "next/link";
import { RecoveryForm } from "@/app/auth-action-form";
import { AuthShell } from "@/app/auth-shell";
import { resumeLensLoginPath, safeRelativeReturnPath } from "@/lib/auth-paths";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Reset password — ResumeLens" };

const errors: Record<string, string> = {
  invalid_email: "Enter a valid email address.",
  rate_limited: "Too many requests. Wait a few minutes before requesting another link.",
  blocked: "That request was blocked for your protection. Refresh and try again.",
  unavailable: "Password recovery is temporarily unavailable. Please try again shortly.",
};

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ return_to?: string | string[]; error?: string | string[] }> }) {
  const query = await searchParams;
  const returnTo = safeRelativeReturnPath(first(query.return_to));
  const error = errors[first(query.error) ?? ""];
  return (
    <AuthShell heading="Reset your password" copy="Enter the email linked to your ResumeLens account. We’ll send a secure reset link if the account exists.">
      {error && <div className="auth-alert" role="alert"><span>!</span><p>{error}</p></div>}
      <RecoveryForm returnTo={returnTo} />
      <p className="auth-center-link"><Link href={resumeLensLoginPath(returnTo)}>← Back to sign in</Link></p>
    </AuthShell>
  );
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
