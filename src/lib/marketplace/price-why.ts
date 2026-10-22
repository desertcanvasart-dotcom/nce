/**
 * EXP-001, adapted (Batch 9 brief): "Why this price?" from real facts about the vessel and its sailings, never invented
 * per-vessel amounts (ADR-007). The illustrative build-up with sample figures stays on /nile-cruise-prices/.
 */
import { formatMoney } from "@/components/ds/lib/format";
import type { Money, VesselType } from "@/components/ds/lib/types";

export type Season = "festive" | "cooler" | "summer";

/** The seasons the price explainer uses: Christmas–New Year, October–April, May–September (Cairo dates). */
export function seasonOf(day: string): Season {
  const [, m, d] = day.split("-").map(Number) as [number, number, number];
  if ((m === 12 && d >= 24) || (m === 1 && d <= 7)) return "festive";
  return m >= 10 || m <= 4 ? "cooler" : "summer";
}

export const SEASON_TEXT: Record<Season, string> = {
  festive: "Christmas and New Year, the busiest and dearest weeks",
  cooler: "the cooler season (October to April), the main season",
  summer: "summer (May to September), hot, quiet and the lowest prices",
};

export type PriceFacts = {
  price: Money;
  vesselType: VesselType;
  maxGuests: number | null;
  nights?: number;
  nextDeparture?: string;
  gratuityUsdMinor: number | null;
  /** The "with sightseeing" option and who provides it (ADR-102). */
  sightseeing?: { by: "vessel" | "nilecruz"; from: Money };
};

/** The explainer's lines, in order: what the price is, who shares the boat, the season, sightseeing, what's not in it. */
export function priceWhy(f: PriceFacts): { title: string; lines: string[]; notIncluded: string[] } {
  const money = (m: Money) => formatMoney(m, "en");
  const lines: string[] = [];
  lines.push(
    `${money(f.price)} is per person for two sharing the lowest-priced cabin with places left${f.nights ? `, for ${f.nights} nights` : ""}, from check-in to check-out.`,
  );
  const size =
    f.maxGuests === null
      ? "The boat’s running costs are shared by its guests."
      : f.maxGuests <= 20
        ? `Up to ${f.maxGuests} guests share this boat and its crew, so each pays a larger share than on a big ship.`
        : f.maxGuests <= 80
          ? `Up to ${f.maxGuests} guests share this ship and its crew: a mid-sized ship.`
          : `Up to ${f.maxGuests} guests share this ship, so each pays a smaller share of its running costs.`;
  lines.push(size);
  if (f.vesselType === "sail")
    lines.push("A dahabiya sails with the wind and moors where it likes, often at a private riverbank.");
  if (f.nextDeparture)
    lines.push(`The next sailing falls in ${SEASON_TEXT[seasonOf(f.nextDeparture)]}; prices change with the season.`);
  if (f.sightseeing)
    lines.push(
      f.sightseeing.by === "vessel"
        ? `Sightseeing isn’t in this price. The vessel also sells it with its own sightseeing, from ${money(f.sightseeing.from)}.`
        : `Sightseeing isn’t in this price. With Nilecruz’s sightseeing programme it’s from ${money(f.sightseeing.from)}, as two bookings paid together.`,
    );
  else lines.push("Sightseeing isn’t in this price.");
  const notIncluded = [
    f.gratuityUsdMinor
      ? `Crew gratuity: ${money({ amount: f.gratuityUsdMinor, currency: "USD" })} per person per night, paid on board at check-out.`
      : "Crew gratuity, paid on board at check-out.",
    "Flights and airport transfers, booked separately.",
  ];
  return { title: `Why ${money(f.price)}?`, lines, notIncluded };
}
