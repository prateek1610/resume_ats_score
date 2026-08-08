import { redirect } from "next/navigation";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { isSupabaseAuthConfigured } from "@/lib/auth/config";
import { createSupabaseServerClient } from "@/lib/auth/supabase-server";
import { appSignOutPath, resumeLensLoginPath } from "@/lib/auth-paths";
import { errorType, securityLog } from "@/lib/security-log";

export type AppUser = {
  id: string;
  displayName: string;
  email: string;
  fullName: string | null;
  provider: "supabase" | "chatgpt" | "preview";
};

const previewUser: AppUser = {
  id: "preview-user",
  displayName: "Preview User",
  email: "preview@resumelens.local",
  fullName: "Preview User",
  provider: "preview",
};

export async function getAppUser(): Promise<AppUser | null> {
  if (isSupabaseAuthConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      const { data, error } = await supabase.auth.getUser();
      const user = data.user;
      if (error || !user?.email || !user.email_confirmed_at) return null;

      const fullName = cleanDisplayName(user.user_metadata?.full_name ?? user.user_metadata?.name);
      return {
        id: user.id,
        displayName: fullName ?? user.email,
        email: user.email.toLowerCase(),
        fullName,
        provider: "supabase",
      };
    } catch (error) {
      securityLog("warn", "auth_session_validation_failed", undefined, { errorType: errorType(error) });
      return null;
    }
  }

  const chatGPTUser = await getChatGPTUser();
  if (chatGPTUser) {
    return {
      id: `chatgpt:${chatGPTUser.email.toLowerCase()}`,
      ...chatGPTUser,
      email: chatGPTUser.email.toLowerCase(),
      provider: "chatgpt",
    };
  }
  return process.env.NODE_ENV === "development" ? previewUser : null;
}

export async function requireAppUser(returnTo: string) {
  const user = await getAppUser();
  if (!user) redirect(resumeLensLoginPath(returnTo));
  return user;
}

export function signOutPath(returnTo = "/") {
  return appSignOutPath(returnTo, isSupabaseAuthConfigured());
}

function cleanDisplayName(value: unknown) {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 80);
  return cleaned || null;
}
