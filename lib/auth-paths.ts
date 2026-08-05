const SIGN_IN_PATH = "/signin-with-chatgpt";
const SIGN_OUT_PATH = "/signout-with-chatgpt";
const CALLBACK_PATH = "/callback";
const LOGIN_PATH = "/login";
const SIGNUP_PATH = "/signup";
const SUPABASE_CALLBACK_PATH = "/auth/callback";
const FORGOT_PASSWORD_PATH = "/forgot-password";
const UPDATE_PASSWORD_PATH = "/auth/update-password";

export function safeRelativeReturnPath(value: string | null | undefined, fallback = "/dashboard") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;

  let url: URL;
  try {
    url = new URL(value, "https://app.local");
  } catch {
    return fallback;
  }

  if (url.origin !== "https://app.local" || isAuthPath(url.pathname)) return fallback;
  return `${url.pathname}${url.search}${url.hash}`;
}

export function chatGPTSignInPath(returnTo: string): string {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `${SIGN_IN_PATH}?return_to=${encodeURIComponent(safeReturnTo)}`;
}

export function chatGPTSignOutPath(returnTo = "/"): string {
  const safeReturnTo = safeRelativeReturnPath(returnTo, "/");
  return `${SIGN_OUT_PATH}?return_to=${encodeURIComponent(safeReturnTo)}`;
}

export function appSignOutPath(returnTo = "/", useSupabase = true) {
  const safeReturnTo = safeRelativeReturnPath(returnTo, "/");
  return useSupabase
    ? `/auth/signout?return_to=${encodeURIComponent(safeReturnTo)}`
    : chatGPTSignOutPath(safeReturnTo);
}

export function resumeLensLoginPath(returnTo = "/dashboard") {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `${LOGIN_PATH}?return_to=${encodeURIComponent(safeReturnTo)}`;
}

export function resumeLensSignupPath(returnTo = "/dashboard") {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `${SIGNUP_PATH}?return_to=${encodeURIComponent(safeReturnTo)}`;
}

export function forgotPasswordPath(returnTo = "/dashboard") {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `${FORGOT_PASSWORD_PATH}?return_to=${encodeURIComponent(safeReturnTo)}`;
}

export function supabaseCallbackPath(returnTo = "/dashboard") {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `${SUPABASE_CALLBACK_PATH}?return_to=${encodeURIComponent(safeReturnTo)}`;
}

function isAuthPath(pathname: string) {
  return [SIGN_IN_PATH, SIGN_OUT_PATH, CALLBACK_PATH, LOGIN_PATH, SIGNUP_PATH, SUPABASE_CALLBACK_PATH, FORGOT_PASSWORD_PATH, UPDATE_PASSWORD_PATH].includes(pathname);
}
