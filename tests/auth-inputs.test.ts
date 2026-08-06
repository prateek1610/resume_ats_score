import assert from "node:assert/strict";
import test from "node:test";
import { emailLinkSchema, passwordLoginSchema, passwordSignupSchema, recoverySchema, updatePasswordSchema } from "../lib/auth/inputs.ts";

test("normalizes valid login and email-link inputs", () => {
  assert.deepEqual(passwordLoginSchema.parse({ email: "  User@Example.COM ", password: "password" }), {
    email: "user@example.com",
    password: "password",
  });
  assert.equal(emailLinkSchema.parse({ email: "User@Example.com", intent: "login" }).email, "user@example.com");
  assert.equal(recoverySchema.parse({ email: "USER@example.com" }).email, "user@example.com");
});

test("requires a strong matching password and a usable name for signup", () => {
  const valid = passwordSignupSchema.safeParse({
    fullName: "Asha Mehta",
    email: "asha@example.com",
    password: "violet-saturn-lantern-river-47",
    confirmPassword: "violet-saturn-lantern-river-47",
    returnTo: "/dashboard",
  });
  assert.equal(valid.success, true);

  assert.equal(passwordSignupSchema.safeParse({
    fullName: "A",
    email: "not-an-email",
    password: "too-short",
    confirmPassword: "different",
  }).success, false);
});

test("rejects common long passwords", () => {
  assert.equal(passwordSignupSchema.safeParse({
    fullName: "Asha Mehta",
    email: "asha@example.com",
    password: "passwordpassword",
    confirmPassword: "passwordpassword",
  }).success, false);
});

test("rejects mismatched or oversized password updates", () => {
  assert.equal(updatePasswordSchema.safeParse({ password: "a secure password", confirmPassword: "another secure password" }).success, false);
  assert.equal(updatePasswordSchema.safeParse({ password: "x".repeat(129), confirmPassword: "x".repeat(129) }).success, false);
});
