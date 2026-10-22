import { z } from "zod";
import { BEST_FOR, CATEGORIES } from "@/lib/catalogue/categories";
import { MOORING, SHARED_SPACES } from "@/lib/catalogue/mooring";

/** Admin catalogue editor inputs (DASH-ADM-013–019). Messages are shown to admins as written. */
const optInt = (min: number, max: number) =>
  z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v)))
    .refine((v) => v === null || (Number.isInteger(v) && v >= min && v <= max), `a whole number from ${min} to ${max}`);

const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `at most ${max} characters`)
    .transform((v) => (v === "" ? null : v));

export const vesselDetailsInput = z.object({
  name: z.string().trim().min(1, "required").max(120, "at most 120 characters"),
  type: z.enum(["sail", "motor", "steam"], { message: "choose a type" }),
  route_text: optText(200),
  category: z
    .union([z.literal(""), z.enum(CATEGORIES.map((c) => c.value) as [string, ...string[]])])
    .transform((v) => (v === "" ? null : v)),
  cabin_count: optInt(1, 400),
  max_guests: optInt(1, 800),
  deck_count: optInt(1, 10),
  year_built: optInt(1850, 2100),
  best_for: z.array(z.enum(BEST_FOR.map((b) => b.value) as [string, ...string[]])).max(10),
  mooring: z.union([z.literal(""), z.enum(MOORING.map((m) => m.value))]).transform((v) => (v === "" ? null : v)),
  shared_spaces: z.array(z.enum(SHARED_SPACES.map((s) => s.value))).max(SHARED_SPACES.length),
  operator_org_id: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .refine((v) => v === null || /^[0-9a-f-]{36}$/.test(v), "choose an operator from the list"),
});

export const newVesselInput = z.object({
  name: z.string().trim().min(1, "required").max(120, "at most 120 characters"),
  type: z.enum(["sail", "motor", "steam"], { message: "choose a type" }),
});

export const descriptionsInput = z.object({
  description_en: optText(4000),
  description_es: optText(4000),
  description_ja: optText(4000),
});

export const photoInput = z.object({
  alt_en: z.string().trim().min(1, "describe what the photo shows").max(300, "at most 300 characters"),
  alt_es: optText(300),
  alt_ja: optText(300),
  credit: z.string().trim().min(1, "required, as the licence asks").max(200, "at most 200 characters"),
  rights: z.literal("yes", { message: "confirm Nilecruz may publish this photo" }),
});

export const photoEditInput = photoInput.omit({ rights: true }).extend({
  sort_order: optInt(0, 999),
});

export const visibilityInput = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("private") }),
  z.object({ mode: z.literal("published") }),
  z.object({
    mode: z.literal("showcase"),
    showcase_until: z.iso.date({ message: "choose an end date" }),
    showcase_reason: z.string().trim().min(5, "explain why, in a few words").max(300, "at most 300 characters"),
  }),
]);

export const externalRatingInput = z
  .object({
    source_name: z.string().trim().min(1, "required").max(120),
    rating: z.coerce.number({ message: "a number" }).min(0, "0 or more"),
    scale: z.coerce.number({ message: "a number" }).positive("more than 0"),
    review_count: optInt(0, 10_000_000),
    url: z
      .string()
      .trim()
      .transform((v) => (v === "" ? null : v))
      .refine((v) => v === null || /^https:\/\/\S+$/.test(v), "a full https:// link"),
    retrieved_on: z.iso.date({ message: "choose the date you read it" }),
  })
  .refine((v) => v.rating <= v.scale, { message: "can't be higher than the scale", path: ["rating"] });

export const safetyInput = z.object({
  observed_on: z.iso.date({ message: "choose a date" }),
  status: z.enum(["open", "under_review", "resolved"], { message: "choose a status" }),
  notes: z.string().trim().min(1, "required").max(4000, "at most 4,000 characters"),
});

const criterion = z.coerce
  .number({ message: "a number from 0 to 5" })
  .min(0, "from 0 to 5")
  .max(5, "from 0 to 5")
  .refine((v) => Number.isInteger(v * 2), "whole or half points");

/** ADR-070 / ADR-074: an evaluation; the 28 scores arrive as s_<dimension>_<0-3>. */
export const evaluationInput = z.object({
  assessed_on: z.iso.date({ message: "choose the assessment date" }),
  evaluator: z.string().trim().min(1, "required").max(120, "at most 120 characters"),
  verdict: z.enum(["recommended", "recommended_with_reservations", "not_recommended"], { message: "choose a verdict" }),
  notes_en: optText(4000),
  notes_es: optText(4000),
  notes_ja: optText(4000),
  published: z
    .string()
    .optional()
    .transform((v) => v === "yes"),
});
export { criterion as criterionScore };
