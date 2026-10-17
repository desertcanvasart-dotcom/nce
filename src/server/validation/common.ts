import { z } from "zod";
import { RESERVED_VESSEL_SLUGS, SLUG_PATTERN } from "@/lib/data/slugs";

export const uuid = z.uuid();
export const locale = z.enum(["en", "es", "ja"]);
export const currencyCode = z.string().regex(/^[A-Z]{3}$/, "Use a three-letter currency code, such as USD.");
/** Money in minor units (cents, piastres). Never a float (DATA-001). */
export const minorUnits = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const money = z.object({ amount: minorUnits, currency: currencyCode });

export const slug = z.string().max(80).regex(SLUG_PATTERN, "Use lower-case letters, numbers and single hyphens.");
export const vesselSlug = slug.refine((s) => !(RESERVED_VESSEL_SLUGS as readonly string[]).includes(s), {
  message: "This address is reserved for a cruise listing page.",
});

export const trimmed = (max: number) => z.string().trim().min(1).max(max);
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();
