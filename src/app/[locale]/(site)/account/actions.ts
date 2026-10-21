"use server";

import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { Locale } from "@/i18n/routing";
import { safeNextPath } from "@/lib/auth/next-path";
import { env, siteUrl } from "@/lib/env";
import { localizedPath } from "@/lib/seo/metadata";
import { allowAnonymous, landingPath, requireUser } from "@/server/auth";
import { rateLimit, trapFilled } from "@/server/security/rate-limit";
import { getDb } from "@/server/db";
import {
  changeEmailInput,
  changePasswordInput,
  confirmLinkInput,
  emailOnly,
  errorKeys,
  parseInput,
  setPasswordInput,
  signInInput,
  signUpInput,
  twoStepInput,
  verifyFactorInput,
  type AccountErrorKey,
} from "@/server/validation";

/**
 * Account actions (SEC-005, SEC-014, SEC-015, DASH-CUS-013). Each one validates its input on the server,
 * and every action for signed-in people starts with requireUser(). Messages are keys under `account.messages`.
 */
export type MessageKey =
  | "badCredentials"
  | "notConfirmed"
  | "rateLimited"
  | "unexpected"
  | "checkEmail"
  | "linkExpired"
  | "codeWrong"
  | "passwordChanged"
  | "emailChangeSent"
  | "twoStepOff"
  | "adminNeedsTwoStep"
  | "resetLinkNeeded";

export type FormState = {
  status: "idle" | "error" | "sent" | "done" | "enrol";
  message?: MessageKey;
  fields?: Record<string, AccountErrorKey>;
  values?: { email?: string; full_name?: string };
  enrol?: { factorId: string; qr: string; secret: string };
};

const form = (fd: FormData) => Object.fromEntries([...fd.entries()].map(([k, v]) => [k, typeof v === "string" ? v : ""]));
const page = (locale: Locale, path: string, query = "") => `${localizedPath(locale, path)}${query}`;
const confirmUrl = (locale: Locale) => `${siteUrl}${localizedPath(locale, "/account/confirm")}`;
const invalid = (errors: Record<string, string[]>, values?: FormState["values"]): FormState => ({
  status: "error",
  fields: errorKeys(errors),
  values,
});

function authMessage(code: string | undefined): MessageKey {
  if (code === "invalid_credentials") return "badCredentials";
  if (code === "email_not_confirmed") return "notConfirmed";
  if (code?.startsWith("over_")) return "rateLimited";
  return "unexpected";
}

export async function signIn(_prev: FormState, fd: FormData): Promise<FormState> {
  allowAnonymous();
  const input = parseInput(signInInput, form(fd));
  if (!input.ok) return invalid(input.errors, { email: String(fd.get("email") ?? "") });
  const { email, password, locale, next } = input.data;

  // SEC-006: tries from this address, and failed tries for this email (password guessing), are limited.
  const who = `email:${email.toLowerCase()}`;
  if (!(await rateLimit("sign-in")).ok || !(await rateLimit("sign-in-failed", who, { peek: true })).ok)
    return { status: "error", message: "rateLimited", values: { email } };
  const db = await getDb();
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === "invalid_credentials") await rateLimit("sign-in-failed", who);
    return { status: "error", message: authMessage(error.code), values: { email } };
  }

  const target = safeNextPath(next);
  const { data: level } = await db.auth.mfa.getAuthenticatorAssuranceLevel();
  if (level?.nextLevel === "aal2" && level.currentLevel !== "aal2") {
    redirect(page(locale, "/account/two-step", `?next=${encodeURIComponent(target)}`));
  }
  redirect(await landingPath(target));
}

export async function signUp(_prev: FormState, fd: FormData): Promise<FormState> {
  allowAnonymous();
  const raw = form(fd);
  const input = parseInput(signUpInput, raw);
  if (!input.ok) return invalid(input.errors, { email: raw.email, full_name: raw.full_name });
  const { email, password, full_name, locale } = input.data;
  // A bot filled the hidden field: the same answer as a real sign-up, and no account.
  if (trapFilled(fd)) return { status: "sent", message: "checkEmail", values: { email } };
  if (!(await rateLimit("sign-up")).ok) return { status: "error", message: "rateLimited", values: { email, full_name } };
  const db = await getDb();
  const { error } = await db.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: confirmUrl(locale), data: { full_name, locale } },
  });
  if (error?.code === "weak_password")
    return { status: "error", fields: { password: "passwordLetterDigit" }, values: { email, full_name } };
  if (error) return { status: "error", message: authMessage(error.code), values: { email, full_name } };
  // Same answer whether or not the address already has an account, so nobody can probe for accounts.
  return { status: "sent", message: "checkEmail", values: { email } };
}

export async function resendConfirmation(_prev: FormState, fd: FormData): Promise<FormState> {
  allowAnonymous();
  const input = parseInput(emailOnly, form(fd));
  if (!input.ok) return invalid(input.errors);
  if (!(await rateLimit("password-reset")).ok) return { status: "error", message: "rateLimited" };
  const db = await getDb();
  const { error } = await db.auth.resend({
    type: "signup",
    email: input.data.email,
    options: { emailRedirectTo: confirmUrl(input.data.locale) },
  });
  if (error?.code?.startsWith("over_")) return { status: "error", message: "rateLimited" };
  return { status: "sent", message: "checkEmail" };
}

export async function requestPasswordReset(_prev: FormState, fd: FormData): Promise<FormState> {
  allowAnonymous();
  const input = parseInput(emailOnly, form(fd));
  if (!input.ok) return invalid(input.errors, { email: String(fd.get("email") ?? "") });
  if (trapFilled(fd)) return { status: "sent", message: "checkEmail" };
  if (!(await rateLimit("password-reset")).ok) return { status: "error", message: "rateLimited" };
  const db = await getDb();
  const { error } = await db.auth.resetPasswordForEmail(input.data.email, { redirectTo: confirmUrl(input.data.locale) });
  if (error?.code?.startsWith("over_")) return { status: "error", message: "rateLimited" };
  return { status: "sent", message: "checkEmail" };
}

/** Email links land on a page with a button that posts here, so link scanners can't use up the single-use token. */
export async function confirmLink(_prev: FormState, fd: FormData): Promise<FormState> {
  allowAnonymous();
  const input = parseInput(confirmLinkInput, form(fd));
  if (!input.ok) return { status: "error", message: "linkExpired" };
  const { token_hash, type, locale } = input.data;
  const db = await getDb();
  const { data, error } = await db.auth.verifyOtp({ token_hash, type });
  if (error) return { status: "error", message: "linkExpired" };
  if (type === "recovery" || type === "invite") redirect(page(locale, "/account/reset-password/new"));
  if (type === "email_change") {
    // Double confirmation: Supabase returns no user until both addresses are confirmed (checked against local Auth).
    const pending = !data.user || !!data.user.new_email;
    redirect(page(locale, "/account/security", pending ? "?notice=emailHalfConfirmed" : "?notice=emailChanged"));
  }
  redirect(await landingPath("/dashboard/"));
}

/** Setting a password without the current one is allowed only in a session that came from a reset link in the last hour. */
export async function setNewPassword(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireUser("/account/reset-password/new/");
  const input = parseInput(setPasswordInput, form(fd));
  if (!input.ok) return invalid(input.errors);
  const db = await getDb();
  const { data } = await db.auth.getClaims();
  const amr = (data?.claims?.amr ?? []) as { method: string; timestamp: number }[];
  const fromLink = amr.some((a) => ["recovery", "otp", "invite"].includes(a.method) && Date.now() / 1000 - a.timestamp < 3600);
  if (!fromLink) return { status: "error", message: "resetLinkNeeded" };
  const { error } = await db.auth.updateUser({ password: input.data.password });
  if (error?.code === "same_password") return { status: "error", fields: { password: "passwordReuse" } };
  if (error?.code === "weak_password") return { status: "error", fields: { password: "passwordLetterDigit" } };
  if (error) return { status: "error", message: "unexpected" };
  redirect(await landingPath("/dashboard/"));
}

/**
 * Checks the current password on a separate, throwaway session, so the person's own session (and two-step level) stays.
 * Wrong tries are limited per account (SEC-011): the check runs from our server, so Supabase sees one address.
 */
async function currentPasswordIsRight(email: string, password: string): Promise<boolean | "limited"> {
  const who = `email:${email.toLowerCase()}`;
  if (!(await rateLimit("password-check", who, { peek: true })).ok) return "limited";
  const right = await probePassword(email, password);
  if (!right) await rateLimit("password-check", who);
  return right;
}

async function probePassword(email: string, password: string): Promise<boolean> {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return false;
  const probe = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await probe.auth.signInWithPassword({ email, password });
  if (error) return false;
  await probe.auth.signOut({ scope: "local" });
  return true;
}

export async function changePassword(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await requireUser("/account/security/");
  const input = parseInput(changePasswordInput, form(fd));
  if (!input.ok) return invalid(input.errors);
  const right = await currentPasswordIsRight(session.email, input.data.current);
  if (right === "limited") return { status: "error", message: "rateLimited" };
  if (!right) return { status: "error", fields: { current: "currentPasswordWrong" } };
  const db = await getDb();
  const { error } = await db.auth.updateUser({ password: input.data.password });
  if (error?.code === "same_password") return { status: "error", fields: { password: "passwordReuse" } };
  if (error) return { status: "error", message: "unexpected" };
  return { status: "done", message: "passwordChanged" };
}

export async function changeEmail(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await requireUser("/account/security/");
  const input = parseInput(changeEmailInput, form(fd));
  if (!input.ok) return invalid(input.errors, { email: String(fd.get("email") ?? "") });
  const right = await currentPasswordIsRight(session.email, input.data.current);
  if (right === "limited") return { status: "error", message: "rateLimited", values: { email: input.data.email } };
  if (!right) return { status: "error", fields: { current: "currentPasswordWrong" }, values: { email: input.data.email } };
  const db = await getDb();
  const { error } = await db.auth.updateUser({ email: input.data.email }, { emailRedirectTo: confirmUrl(input.data.locale) });
  if (error?.code?.startsWith("over_")) return { status: "error", message: "rateLimited" };
  if (error) return { status: "error", message: "unexpected" };
  // Both the old and the new address get a link (double confirmation).
  return { status: "sent", message: "emailChangeSent" };
}

export async function startTwoStep(_prev: FormState, _fd: FormData): Promise<FormState> {
  await requireUser("/account/security/");
  const db = await getDb();
  const { data: factors } = await db.auth.mfa.listFactors();
  // An abandoned set-up leaves an unverified factor behind; clear it so a new one can start.
  for (const f of factors?.all ?? []) {
    if (f.status === "unverified") await db.auth.mfa.unenroll({ factorId: f.id });
  }
  const { data, error } = await db.auth.mfa.enroll({ factorType: "totp", friendlyName: `Authenticator ${Date.now()}` });
  if (error || !data) return { status: "error", message: "unexpected" };
  return { status: "enrol", enrol: { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret } };
}

export async function verifyTwoStep(prev: FormState, fd: FormData): Promise<FormState> {
  const session = await requireUser("/account/security/");
  const input = parseInput(verifyFactorInput, form(fd));
  if (!input.ok) return { ...prev, status: "enrol", fields: errorKeys(input.errors) };
  const who = `user:${session.userId}`;
  if (!(await rateLimit("two-step", who, { peek: true })).ok) return { ...prev, status: "enrol", message: "rateLimited" };
  const db = await getDb();
  const { error } = await db.auth.mfa.challengeAndVerify({ factorId: input.data.factorId, code: input.data.code });
  if (error) {
    await rateLimit("two-step", who);
    return { ...prev, status: "enrol", message: "codeWrong", fields: undefined };
  }
  redirect(safeNextPath(input.data.next, page(input.data.locale, "/account/security", "?notice=twoStepOn")));
}

export async function removeTwoStep(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await requireUser("/account/security/");
  if (session.platformRole === "admin") return { status: "error", message: "adminNeedsTwoStep" };
  const locale = (["en", "es", "ja"] as const).find((l) => l === fd.get("locale")) ?? "en";
  if (session.aal !== "aal2") {
    redirect(page(locale, "/account/two-step", `?next=${encodeURIComponent(localizedPath(locale, "/account/security"))}`));
  }
  const db = await getDb();
  const { data: factors } = await db.auth.mfa.listFactors();
  for (const f of factors?.totp ?? []) {
    const { error } = await db.auth.mfa.unenroll({ factorId: f.id });
    if (error) return { status: "error", message: "unexpected" };
  }
  return { status: "done", message: "twoStepOff" };
}

export async function twoStepSignIn(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await requireUser("/account/two-step/");
  const input = parseInput(twoStepInput, form(fd));
  if (!input.ok) return invalid(input.errors);
  // SEC-011: wrong codes are limited per account (someone holding a stolen password can't keep guessing).
  const who = `user:${session.userId}`;
  if (!(await rateLimit("two-step", who, { peek: true })).ok) return { status: "error", message: "rateLimited" };
  const db = await getDb();
  const { data: factors } = await db.auth.mfa.listFactors();
  const factor = factors?.totp.find((f) => f.status === "verified");
  if (!factor) redirect(page(input.data.locale, "/account/security", "?setup=two-step"));
  const { error } = await db.auth.mfa.challengeAndVerify({ factorId: factor.id, code: input.data.code });
  if (error) {
    await rateLimit("two-step", who);
    return { status: "error", message: "codeWrong" };
  }
  redirect(await landingPath(safeNextPath(input.data.next)));
}

export async function signOutEverywhere(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireUser("/account/security/");
  const locale = (["en", "es", "ja"] as const).find((l) => l === fd.get("locale")) ?? "en";
  const db = await getDb();
  await db.auth.signOut({ scope: "global" });
  redirect(page(locale, "/account/sign-in", "?notice=signedOutEverywhere"));
}
