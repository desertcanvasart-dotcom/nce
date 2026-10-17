/**
 * SEO-030: facet slugs of the cruise silo. A vessel page may never take one of these.
 * Must equal app.is_reserved_slug() in supabase/migrations (checked by tests/unit/validation.test.ts).
 */
export const RESERVED_VESSEL_SLUGS = [
  "dahabiyas",
  "motor-ships",
  "paddle-steamers",
  "luxury",
  "value",
  "luxor-to-aswan",
  "aswan-to-luxor",
  "7-nights",
  "lake-nasser",
  "private-charter",
  "last-minute",
  "compare",
] as const;

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Lower-case ASCII slug from a name: "MS Amwaj Living Stone" → "ms-amwaj-living-stone". */
export function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}
