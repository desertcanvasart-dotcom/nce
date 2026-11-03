import { z } from "zod";

/**
 * EXP-002 (9-2b): Nilecruz's own drawing of a vessel's decks, redrawn from the operator's deck plan. Each deck is a
 * strip from the stern (0) to the bow (100 is the longest deck's bow); each area spans part of that length, across the
 * whole beam or on one side of the corridor, and is a cabin type (by its code) or a shared space. Cabin numbers are
 * never drawn: the operator assigns them (DASH-BND-003). Kept free of I/O so it is unit-tested.
 */

export const SPACES = {
  sun_deck: "Sun deck",
  shade: "Shaded deck",
  pool: "Pool",
  jacuzzi: "Jacuzzi",
  bar: "Bar",
  lounge: "Lounge",
  restaurant: "Restaurant",
  reception: "Reception",
  library: "Library",
  shop: "Shop",
  spa: "Spa",
  gym: "Gym",
  open: "Open deck",
  crew: "Crew only",
} as const;
export type Space = keyof typeof SPACES;
/** How a space is drawn: cabins, rooms indoors, open air, water, or crew areas guests don't enter. */
export type Tone = "cabin" | "room" | "outdoor" | "water" | "crew";
const TONE: Record<Space, Exclude<Tone, "cabin">> = {
  sun_deck: "outdoor",
  shade: "outdoor",
  open: "outdoor",
  pool: "water",
  jacuzzi: "water",
  bar: "room",
  lounge: "room",
  restaurant: "room",
  reception: "room",
  library: "room",
  shop: "room",
  spa: "room",
  gym: "room",
  crew: "crew",
};

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

export const deckLayout = z.object({
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
export type DeckLayout = z.infer<typeof deckLayout>;
export type DeckArea = DeckLayout["decks"][number]["areas"][number];

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

export const toneOf = (a: DeckArea): Tone => (a.cabin ? "cabin" : TONE[a.space!]);
export const areaLabel = (a: DeckArea, cabinName: (code: string) => string | undefined): string =>
  a.label ?? (a.cabin ? (cabinName(a.cabin) ?? a.cabin) : SPACES[a.space!]);

/** The decks each cabin type is on, top deck first, as the layout draws them. */
export function decksOf(layout: DeckLayout, code: string): string[] {
  return layout.decks.filter((d) => d.areas.some((a) => a.cabin === code)).map((d) => d.name);
}

/** What a deck holds, in words, stern to bow and without repeats: the drawing's text alternative. */
export function deckSummary(deck: DeckLayout["decks"][number], cabinName: (code: string) => string | undefined): string[] {
  const seen = new Set<string>();
  for (const a of [...deck.areas].sort((x, y) => x.from - y.from)) seen.add(areaLabel(a, cabinName));
  return [...seen];
}

// ── Geometry: one deck is 1000 × 100 units; the hull runs from y 10 to 90 with the corridor at 50. ─────────────
export const DECK_W = 1000;
const TOP = 10;
const BOTTOM = 90;
const GAP = 4;

/** The area's rectangle inside the hull. */
export function areaBox(a: DeckArea): { x: number; y: number; w: number; h: number } {
  const x = a.from * 10;
  const w = (a.to - a.from) * 10;
  if (a.side === "port") return { x, y: TOP, w, h: 50 - GAP - TOP };
  if (a.side === "starboard") return { x, y: 50 + GAP, w, h: BOTTOM - 50 - GAP };
  return { x, y: TOP, w, h: BOTTOM - TOP };
}

/** The hull outline: a square stern on the left, the bow on the right. */
export function hullPath(length: number, bow: "round" | "square"): string {
  const end = length * 10;
  const r = 6;
  if (bow === "square")
    return `M${r} ${TOP}H${end - 24}Q${end} ${TOP} ${end} ${TOP + 24}V${BOTTOM - 24}Q${end} ${BOTTOM} ${end - 24} ${BOTTOM}H${r}Q0 ${BOTTOM} 0 ${BOTTOM - r}V${TOP + r}Q0 ${TOP} ${r} ${TOP}Z`;
  const shoulder = end - 80;
  return `M${r} ${TOP}H${shoulder}C${end - 20} ${TOP} ${end} 34 ${end} 50C${end} 66 ${end - 20} ${BOTTOM} ${shoulder} ${BOTTOM}H${r}Q0 ${BOTTOM} 0 ${BOTTOM - r}V${TOP + r}Q0 ${TOP} ${r} ${TOP}Z`;
}
