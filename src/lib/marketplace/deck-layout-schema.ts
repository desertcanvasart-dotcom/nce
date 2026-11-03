import { z } from "zod";
import { SPACES, type DeckLayout, type Space } from "./deck-layout";

/** Server-side checks of a deck drawing (EXP-002, 9-2b): its shape, and what an editor should fix. */
const area = z
  .object({
    from: z.number().min(0).max(100),
    to: z.number().min(0).max(100),
    side: z.enum(["port", "starboard"]).optional(),
    cabin: z.string().trim().min(1).max(40).optional(),
    space: z.enum(Object.keys(SPACES) as [Space, ...Space[]]).optional(),
    /** Shown instead of the space's own name, for example "Reading and internet corner". */
    label: z.string().trim().min(1).max(40).optional(),
  })
  .refine((a) => a.to > a.from, "an area ends after it starts")
  .refine((a) => !!a.cabin !== !!a.space, "an area is a cabin type or a space");

const deckLayout = z.object({
  decks: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(30),
        /** Where the bow ends, 0–100; the longest deck reaches 100. */
        length: z.number().min(10).max(100),
        bow: z.enum(["round", "square"]),
        areas: z.array(area).max(80),
      }),
    )
    .min(1)
    .max(8),
});

/** The layout, or null when it is missing or malformed (a bad drawing must never break the vessel page). */
export function parseLayout(raw: unknown): DeckLayout | null {
  const r = deckLayout.safeParse(raw);
  return r.success ? r.data : null;
}

/** Problems an editor should fix: shape, areas past the bow, cabin codes the vessel doesn't have. */
export function layoutProblems(raw: unknown, cabinCodes: string[]): string[] {
  const r = deckLayout.safeParse(raw);
  if (!r.success) return r.error.issues.map((i) => `${i.path.join(".") || "layout"}: ${i.message}`);
  const out: string[] = [];
  for (const d of r.data.decks)
    for (const a of d.areas) {
      if (a.to > d.length) out.push(`Deck ${d.name}: an area runs past the bow (${a.to} > ${d.length})`);
      if (a.cabin && !cabinCodes.includes(a.cabin)) out.push(`Deck ${d.name}: no cabin type with the code ${a.cabin}`);
    }
  return out;
}
