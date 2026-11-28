"use server";

import { z } from "zod";
import type { ActionState } from "@/components/dashboard/ActionForm";
import { allowAnonymous } from "@/server/auth";
import { failed, formObject, problemsFrom, saved } from "@/server/catalogue/form";
import { getDb } from "@/server/db";
import { rateLimit, tooMany, trapFilled } from "@/server/security/rate-limit";

/** PAGE-106: a message from the Contact page, kept for admins (ADR-097). Email notifications come in Batch 8. */
const input = z.object({
  name: z.string().trim().min(1, "your name").max(120),
  email: z.email({ message: "an email address like name@example.com" }).max(254),
  topic: z.enum(["cruise", "booking", "vessel", "partner", "other"]),
  message: z.string().trim().min(10, "at least a sentence").max(4000),
});

const THANKS = "Thank you. We reply by email, usually within one working day.";
const JA = {
  thanks: "お問い合わせありがとうございます。通常1営業日以内にメールで返信します。",
  failed: "メッセージを送信できませんでした。少し時間をおいて、もう一度お試しください。",
  fix: "送信できませんでした。次の項目をご確認ください。",
  fields: {
    name: "お名前を120文字以内で入力してください。",
    email: "name@example.com のような形式でメールアドレスを入力してください。",
    topic: "お問い合わせの内容を選んでください。",
    message: "メッセージは10文字以上4000文字以内で入力してください。",
  } as Record<string, string>,
  tooMany: (seconds: number) => `送信回数が多すぎます。約${Math.max(1, Math.ceil(seconds / 60))}分後にもう一度お試しください。`,
};

export async function sendContactMessage(_prev: ActionState, fd: FormData): Promise<ActionState> {
  allowAnonymous();
  const ja = fd.get("locale") === "ja" ? JA : null;
  const thanks = ja?.thanks ?? THANKS;
  // A field people never see: bots fill it in. Answer as if it worked, and keep nothing.
  if (trapFilled(fd)) return saved(thanks);
  const f = formObject(fd);
  const limit = await rateLimit("contact");
  if (!limit.ok) return failed(ja ? ja.tooMany(limit.retryAfter) : tooMany(limit.retryAfter));
  const r = input.safeParse(f);
  if (!r.success && ja) {
    const problems = [...new Set(r.error.issues.map((i) => ja.fields[String(i.path[0])] ?? ja.failed))];
    return { ok: false, message: ja.fix, problems };
  }
  if (!r.success) return problemsFrom(r.error, { name: "Name", email: "Email", topic: "Topic", message: "Message" });
  const db = await getDb();
  const { error } = await db.from("contact_messages").insert(r.data);
  if (error) return failed(ja?.failed ?? "Your message couldn’t be sent. Please try again in a moment.");
  return saved(thanks);
}
