"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import { getDb } from "@/server/db";

export type ApplyPartnerState = {
  error?: "companyRequired" | "required" | "tooLong" | "websiteFormat" | "already" | "unexpected";
  field?: string;
};

const FIELDS = [
  "display_name",
  "legal_name",
  "country",
  "registration_number",
  "website",
  "contact_name",
  "contact_phone",
] as const;
const required = z.string().trim().min(1, "required").max(120, "tooLong");
const input = z.object({
  display_name: z.string().trim().min(1, "companyRequired").max(120, "tooLong"),
  legal_name: z.string().trim().max(200, "tooLong"),
  country: required,
  registration_number: required,
  website: z
    .string()
    .trim()
    .max(200, "tooLong")
    .refine((v) => v === "" || /^https:\/\/\S+$/.test(v), "websiteFormat"),
  contact_name: required,
  contact_phone: z.string().trim().min(5, "required").max(40, "tooLong"),
});

/** DASH-B2B-011, ADR-092: a signed-in person applies for trade access; the agency starts "applied" with them as owner. */
export async function applyAsPartner(_prev: ApplyPartnerState, fd: FormData): Promise<ApplyPartnerState> {
  await requireUser("/account/apply-partner/");
  const parsed = input.safeParse(Object.fromEntries(FIELDS.map((k) => [k, String(fd.get(k) ?? "")])));
  if (!parsed.success) {
    const issue = parsed.error.issues[0]!;
    return { error: issue.message as ApplyPartnerState["error"], field: String(issue.path[0]) };
  }
  const { display_name, legal_name, ...registration } = parsed.data;
  const db = await getDb();
  const { error } = await db.rpc("apply_as_partner", { display_name, legal_name, registration });
  if (error?.code === "23505") return { error: "already" };
  if (error) return { error: "unexpected" };
  redirect("/dashboard/");
}
