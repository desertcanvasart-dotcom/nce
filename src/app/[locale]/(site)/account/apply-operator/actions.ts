"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import { getDb } from "@/server/db";

export type ApplyState = { error?: "companyRequired" | "tooLong" | "websiteFormat" | "already" | "unexpected"; field?: string };

const input = z.object({
  display_name: z.string().trim().min(1, "companyRequired").max(120, "tooLong"),
  legal_name: z.string().trim().max(200, "tooLong"),
  country: z.string().trim().max(80, "tooLong"),
  registration_number: z.string().trim().max(80, "tooLong"),
  website: z
    .string()
    .trim()
    .max(200, "tooLong")
    .refine((v) => v === "" || /^https:\/\/\S+$/.test(v), "websiteFormat"),
});

/** ADR-073 / DASH-ADM-042: a signed-in person applies; the company starts "applied" with them as owner. */
export async function applyAsOperator(_prev: ApplyState, fd: FormData): Promise<ApplyState> {
  await requireUser("/account/apply-operator/");
  const raw = Object.fromEntries(
    ["display_name", "legal_name", "country", "registration_number", "website"].map((k) => [k, String(fd.get(k) ?? "")]),
  );
  const parsed = input.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0]!;
    return { error: issue.message as ApplyState["error"], field: String(issue.path[0]) };
  }
  const d = parsed.data;
  const db = await getDb();
  const { error } = await db.rpc("apply_as_operator", {
    display_name: d.display_name,
    legal_name: d.legal_name,
    registration: { country: d.country, registration_number: d.registration_number, website: d.website },
  });
  if (error?.code === "23505") return { error: "already" };
  if (error) return { error: "unexpected" };
  redirect("/dashboard/");
}
