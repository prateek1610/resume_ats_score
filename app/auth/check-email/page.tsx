import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/app/auth-shell";
import { resumeLensLoginPath, safeRelativeReturnPath } from "@/lib/auth-paths";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Check your email — ResumeLens" };

export default async function CheckEmailPage({ searchParams }: { searchParams: Promise<{ purpose?: string | string[]; return_to?: string | string[] }> }) {
  const query = await searchParams;
  const purpose = first(query.purpose);
  const returnTo = safeRelativeReturnPath(first(query.return_to));
  const copy = purpose === "recovery"
    ? "If a ResumeLens account exists for that address, a password-reset link is on its way."
    : purpose === "signup"
      ? "We sent a verification link. Open it in the same browser to finish creating your account."
      : "If that email belongs to a ResumeLens account, a one-time sign-in link is on its way.";

  return (
    <AuthShell heading="Check your email" copy={copy}>
      <div className="auth-mail-illustration" aria-hidden="true">✉</div>
      <div className="auth-status-note"><strong>Didn’t receive it?</strong><p>Check spam, confirm the address you entered, and wait at least 60 seconds before requesting another email.</p></div>
      <p className="auth-center-link"><Link href={purpose === "recovery" ? `/forgot-password?return_to=${encodeURIComponent(returnTo)}` : resumeLensLoginPath(returnTo)}>Try again with a different email</Link></p>
    </AuthShell>
  );
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
