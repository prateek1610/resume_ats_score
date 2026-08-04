import type { Metadata } from "next";
import { AuthScreen } from "@/app/auth-screen";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sign in — ResumeLens" };

export default function LoginPage({ searchParams }: { searchParams: Promise<{ return_to?: string | string[]; error?: string | string[] }> }) {
  return <AuthScreen mode="login" searchParams={searchParams} />;
}
