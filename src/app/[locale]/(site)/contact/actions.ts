"use server";

import { z } from "zod";
import type { ActionState } from "@/components/dashboard/ActionForm";
import { allowAnonymous } from "@/server/auth";
import { failed, formObject, problemsFrom, saved } from "@/server/catalogue/form";
import { getDb } from "@/server/db";
import { rateLimit, tooMany } from "@/server/security/rate-limit";

/** PAGE-106: a message from the Contact page, kept for admins (ADR-097). Email notifications come in Batch 8. */
const input = z.object({
  name: z.string().trim().min(1, "your name").max(120),
  email: z.email({ message: "an email address like name@example.com" }).max(254),
  topic: z.enum(["cruise", "booking", "vessel", "partner", "other"]),
  message: z.string().trim().min(10, "at least a sentence").max(4000),
});

export async function sendContactMessage(_prev: ActionState, fd: FormData): Promise<ActionState> {
  allowAnonymous();
  const f = formObject(fd);
  // A field people never see: bots fill it in. Answer as if it worked, and keep nothing.
  if (String(f.website ?? "").trim()) return saved("Thank you. We reply by email, usually within one working day.");
  const limit = await rateLimit("contact");
  if (!limit.ok) return failed(tooMany(limit.retryAfter));
  const r = input.safeParse(f);
  if (!r.success) return problemsFrom(r.error, { name: "Name", email: "Email", topic: "Topic", message: "Message" });
  const db = await getDb();
  const { error } = await db.from("contact_messages").insert(r.data);
  if (error) return failed("Your message couldn’t be sent. Please try again in a moment.");
  return saved("Thank you. We reply by email, usually within one working day.");
}
