import { z } from "zod";

const email = z.string().trim().email("Enter a valid email address.").max(254).transform((value) => value.toLowerCase());
const password = z.string().min(12, "Use at least 12 characters.").max(128, "Password is too long.");
const returnTo = z.string().max(2_048).optional();

export const passwordLoginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password.").max(128, "Password is too long."),
  returnTo,
});

export const passwordSignupSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(80, "Name is too long."),
  email,
  password,
  confirmPassword: z.string(),
  returnTo,
}).refine((value) => value.password === value.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

export const emailLinkSchema = z.object({
  email,
  intent: z.enum(["login", "signup"]),
  returnTo,
});

export const recoverySchema = z.object({ email, returnTo });

export const updatePasswordSchema = z.object({
  password,
  confirmPassword: z.string(),
}).refine((value) => value.password === value.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

export function formValues(form: FormData) {
  return Object.fromEntries([...form.entries()].filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}
