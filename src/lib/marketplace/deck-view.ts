import { spaceLabel } from "@/lib/catalogue/mooring";
import type { BookingMode } from "./vessel";

/** EXP-002: how a cabin type books on the chosen sailing, in the three colours of the deck view (ADR-099). */
export type DeckState = "instant" | "confirm" | "sold_out";
export const deckState = (m: BookingMode): DeckState => (m === "instant" ? "instant" : m === "sold_out" ? "sold_out" : "confirm");
export const DECK_STATE_TEXT: Record<DeckState, string> = {
  instant: "Instant confirmation",
  confirm: "The operator confirms within a set time",
  sold_out: "Sold out on this sailing",
};

const list = (xs: string[]) => (xs.length < 2 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);

/** The honest size signal: how many guests share the spaces everyone shares. */
export function sharedText(maxGuests: number | null, spaces: string[]): string | null {
  const names = spaces.map((s) => spaceLabel(s).toLowerCase());
  if (!maxGuests) return names.length ? `Shared by all guests: the ${list(names)}.` : null;
  return names.length
    ? `Up to ${maxGuests} guests share the ${list(names)}.`
    : `Up to ${maxGuests} guests share the vessel’s public spaces.`;
}
