import { z } from "zod";
import { locale } from "./common";

/**
 * SEC-005 / SEC-014: inputs to the account actions. Messages are keys under `account.errors` in the
 * message files, so people read them in their own language; anything unexpected shows "invalid".
 */
export const ACCOUNT_ERROR_KEYS = [
  "emailFormat",
  "nameRequired",
  "passwordRequired",
  "passwordLength",
  "passwordMax",
  "passwordLetterDigit",
  "passwordMismatch",
  "passwordReuse",
  "codeFormat",
  "currentPasswordWrong",
  "invalid",
] as const;
export type AccountErrorKey = (typeof ACCOUNT_ERROR_KEYS)[number];

export const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "emailFormat")
  .pipe(z.email({ message: "emailFormat" }));

/** At least 10 characters with a letter and a digit, as Supabase Auth enforces; at most 72 bytes (bcrypt). */
export const newPassword = z
  .string()
  .min(10, "passwordLength")
  .refine((v) => new TextEncoder().encode(v).length <= 72, "passwordMax")
  .refine((v) => /\p{L}/u.test(v) && /\d/.test(v), "passwordLetterDigit");

export const currentPassword = z.string().min(1, "passwordRequired").max(200, "passwordMax");

export const signInInput = z.object({ email, password: currentPassword, locale, next: z.string().max(500).optional() });

export const signUpInput = z.object({
  full_name: z.string().trim().min(1, "nameRequired").max(120, "invalid"),
  email,
  password: newPassword,
  locale,
});

export const emailOnly = z.object({ email, locale });

export const setPasswordInput = z
  .object({ password: newPassword, confirm: z.string(), locale })
  .refine((v) => v.password === v.confirm, { message: "passwordMismatch", path: ["confirm"] });

export const changePasswordInput = z
  .object({ current: currentPassword, password: newPassword, confirm: z.string(), locale })
  .refine((v) => v.password === v.confirm, { message: "passwordMismatch", path: ["confirm"] })
  .refine((v) => v.password !== v.current, { message: "passwordReuse", path: ["password"] });

export const changeEmailInput = z.object({ email, current: currentPassword, locale });

export const code = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "codeFormat");

export const twoStepInput = z.object({ code, locale, next: z.string().max(500).optional() });
export const verifyFactorInput = z.object({
  factorId: z.uuid({ message: "invalid" }),
  code,
  locale,
  next: z.string().max(500).optional(),
});

export const confirmLinkInput = z.object({
  token_hash: z
    .string()
    .min(10)
    .max(200)
    .regex(/^[A-Za-z0-9_-]+$/),
  type: z.enum(["signup", "recovery", "email_change", "email"]),
  locale,
});

/** Turns parseInput's field errors into translatable keys. */
export function errorKeys(errors: Record<string, string[]>): Record<string, AccountErrorKey> {
  const out: Record<string, AccountErrorKey> = {};
  for (const [field, msgs] of Object.entries(errors)) {
    const m = msgs[0] ?? "invalid";
    out[field] = (ACCOUNT_ERROR_KEYS as readonly string[]).includes(m) ? (m as AccountErrorKey) : "invalid";
  }
  return out;
}
