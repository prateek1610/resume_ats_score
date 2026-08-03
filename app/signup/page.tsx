import type { Metadata } from "next";
import { AuthScreen } from "@/app/auth-screen";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Create account — ResumeLens" };

export default function SignupPage({ searchParams }: { searchParams: Promise<{ return_to?: string | string[]; error?: string | string[] }> }) {
  return <AuthScreen mode="signup" searchParams={searchParams} />;
}
