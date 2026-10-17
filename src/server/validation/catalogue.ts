import { z } from "zod";
import { locale, optionalText, slug, trimmed, uuid, vesselSlug } from "./common";

/** Mirrors the checks in supabase/migrations/*_catalogue.sql, so errors reach people before the database. */
export const vesselType = z.enum(["sail", "motor", "steam"]);
export const visibility = z.enum(["private", "showcase", "published"]);
export const vesselCategory = z.enum(["luxury", "value"]);

const count = (max: number) => z.number().int().positive().max(max).nullable().optional();

/** Facts an operator may edit on its own vessel. */
export const vesselFacts = z.object({
  name: trimmed(120),
  type: vesselType,
  category: vesselCategory.nullable().optional(),
  cabin_count: count(400),
  max_guests: count(800),
  deck_count: count(10),
  year_built: z.number().int().min(1850).max(2100).nullable().optional(),
  route_text: optionalText(200),
});

/** Fields only Nilecruz admins change (enforced again by a database trigger). */
export const vesselAdminFields = z.object({
  slug: vesselSlug,
  visibility: visibility,
  operator_org_id: uuid.nullable().optional(),
  source_ref: optionalText(120),
  is_sample: z.boolean().optional(),
});

export const vesselCreate = vesselFacts.extend(vesselAdminFields.shape);
export const vesselUpdate = vesselFacts.partial();

export const vesselTranslation = z.object({
  vessel_id: uuid,
  locale,
  summary: optionalText(600),
  description: optionalText(20000),
});

export const destinationCreate = z.object({
  slug,
  name: trimmed(80),
  visibility: visibility.default("private"),
  is_sample: z.boolean().optional(),
});

export const destinationTranslation = z.object({
  destination_id: uuid,
  locale,
  name: optionalText(80),
  summary: optionalText(600),
});

const storagePath = z.string().regex(/^(vessels|destinations)\/[0-9a-f-]{36}\/[A-Za-z0-9._-]+$/);

/** BRAND-014: a photograph belongs to exactly one vessel or one destination. */
export const mediaCreate = z
  .object({
    vessel_id: uuid.nullable().optional(),
    destination_id: uuid.nullable().optional(),
    storage_path: storagePath,
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    credit: optionalText(200),
    sort_order: z.number().int().default(0),
  })
  .refine((m) => (m.vessel_id ? 1 : 0) + (m.destination_id ? 1 : 0) === 1, {
    message: "A photo belongs to exactly one vessel or destination.",
    path: ["vessel_id"],
  })
  .refine(
    (m) =>
      m.vessel_id
        ? m.storage_path.startsWith(`vessels/${m.vessel_id}/`)
        : m.storage_path.startsWith(`destinations/${m.destination_id}/`),
    { message: "The file path must sit under its vessel or destination.", path: ["storage_path"] },
  );

export const mediaTranslation = z.object({ media_id: uuid, locale, alt: trimmed(300) });
