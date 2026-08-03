import { redirect } from "next/navigation";
import { chatGPTSignInPath, getChatGPTUser, type ChatGPTUser } from "@/app/chatgpt-auth";

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
  if (!user) redirect(chatGPTSignInPath(returnTo));
  return user;
}
