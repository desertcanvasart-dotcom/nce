/**
 * EXP-002 (9-2b): Nilecruz's own drawing of a vessel's decks, redrawn from the operator's deck plan. Each deck is a
 * strip from the stern (0) to the bow (100 is the longest deck's bow); each area spans part of that length, across the
 * whole beam or on one side of the corridor, and is a cabin type (by its code) or a shared space. Cabin numbers are
 * never drawn: the operator assigns them (DASH-BND-003). Kept free of I/O so it is unit-tested, and free of zod so the
 * drawing ships no validator to the browser: the checks live in deck-layout-schema.ts, on the server.
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

/** One area of a deck: a cabin type (by code) or a shared space, from stern 0 to bow 100, on one side or across. */
export type DeckArea = {
  from: number;
  to: number;
  side?: "port" | "starboard";
  cabin?: string;
  space?: Space;
  /** Shown instead of the space's own name, for example "Reading and internet corner". */
  label?: string;
};
export type DeckLayout = {
  decks: {
    name: string;
    /** Where the bow ends, 0–100; the longest deck reaches 100. */
    length: number;
    bow: "round" | "square";
    areas: DeckArea[];
  }[];
};

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
