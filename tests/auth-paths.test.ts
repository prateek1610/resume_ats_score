import assert from "node:assert/strict";
import test from "node:test";
import { appSignOutPath, chatGPTSignInPath, forgotPasswordPath, resumeLensLoginPath, safeRelativeReturnPath, supabaseCallbackPath } from "../lib/auth-paths.ts";

test("preserves safe same-origin return paths", () => {
  assert.equal(safeRelativeReturnPath("/reports/abc?tab=overview#score"), "/reports/abc?tab=overview#score");
  assert.equal(resumeLensLoginPath("/dashboard?sample=1"), "/login?return_to=%2Fdashboard%3Fsample%3D1");
  assert.equal(chatGPTSignInPath("/dashboard"), "/signin-with-chatgpt?return_to=%2Fdashboard");
  assert.equal(appSignOutPath("/", true), "/auth/signout?return_to=%2F");
  assert.equal(forgotPasswordPath("/reports/abc"), "/forgot-password?return_to=%2Freports%2Fabc");
  assert.equal(supabaseCallbackPath("/dashboard?sample=1"), "/auth/callback?return_to=%2Fdashboard%3Fsample%3D1");
});

test("rejects external, malformed, and recursive auth return paths", () => {
  assert.equal(safeRelativeReturnPath("https://evil.example/steal"), "/dashboard");
  assert.equal(safeRelativeReturnPath("//evil.example/steal"), "/dashboard");
  assert.equal(safeRelativeReturnPath("/\\evil.example"), "/dashboard");
  assert.equal(safeRelativeReturnPath("/login?return_to=/login"), "/dashboard");
  assert.equal(safeRelativeReturnPath("/signin-with-chatgpt"), "/dashboard");
  assert.equal(safeRelativeReturnPath("/auth/update-password"), "/dashboard");
});
