import { redirect } from "next/navigation";
import { getChatGPTUser, type ChatGPTUser } from "@/app/chatgpt-auth";
import { resumeLensLoginPath } from "@/lib/auth-paths";

const previewUser: ChatGPTUser = {
  displayName: "Preview User",
  email: "preview@resumelens.local",
  fullName: "Preview User",
};

export async function getAppUser() {
  const user = await getChatGPTUser();
  if (user) return user;
  return process.env.NODE_ENV === "development" ? previewUser : null;
}

export async function requireAppUser(returnTo: string) {
  const user = await getAppUser();
  if (!user) redirect(resumeLensLoginPath(returnTo));
  return user;
}
