import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { UpdatePasswordForm } from "@/app/auth-action-form";
import { AuthShell } from "@/app/auth-shell";
import { getAppUser } from "@/lib/app-auth";
import { resumeLensLoginPath, safeRelativeReturnPath } from "@/lib/auth-paths";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Choose a new password — ResumeLens" };

const errors: Record<string, string> = {
  invalid_password: "Use a matching password between 12 and 128 characters.",
  blocked: "That request was blocked for your protection. Refresh and try again.",
  unavailable: "We couldn’t update the password. Please retry with a fresh reset link.",
};

export default async function UpdatePasswordPage({ searchParams }: { searchParams: Promise<{ return_to?: string | string[]; error?: string | string[] }> }) {
  const query = await searchParams;
  const returnTo = safeRelativeReturnPath(first(query.return_to));
  if (!await getAppUser()) redirect(`${resumeLensLoginPath(returnTo)}&error=recovery_expired`);
  const error = errors[first(query.error) ?? ""];
  return (
    <AuthShell heading="Choose a new password" copy="Create a long, unique password for your ResumeLens account.">
      {error && <div className="auth-alert" role="alert"><span>!</span><p>{error}</p></div>}
      <UpdatePasswordForm returnTo={returnTo} />
    </AuthShell>
  );
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
