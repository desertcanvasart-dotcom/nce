import type { VesselProfile } from "@/components/ds/lib/vessel-profile";
import type { VesselType } from "@/components/ds/lib/types";

/**
 * What each vessel type is like (DATA-009, ADR-096): editorial text, drafted for review, loaded into Sanity as
 * `vesselTypeProfile` documents. Guests and cabins are never written here: they come from the catalogue
 * (`vessel_type_stats`) when the page renders. No price figures until there are enough real rates (6-2).
 */
export const VESSEL_TYPE_TEXT: Record<
  VesselType,
  Omit<VesselProfile, "facts" | "rows"> & {
    rows: Omit<VesselProfile["rows"], "guests" | "cabins">;
    nights: string;
    hub: string;
  }
> = {
  sail: {
    type: "sail",
    name: "Sailing dahabiya",
    short: "The private sailing house",
    line: "A two-masted sailing houseboat with a handful of cabins. It moors at riverbanks and islands, away from the town quays.",
    nights: "4–5 nights",
    rows: {
      power: "Two sails; a tug tows it when there is no wind",
      pace: "Sails by day, mostly between Esna and Aswan",
      mooring: "Riverbanks and islands, away from other boats",
      sound: "Wind and water; no engine while sailing",
      days: "Slow mornings, lunch under sail, smaller sites the ships pass by",
      price: "See current prices on each dahabiya",
    },
    meters: { intimacy: 5, quiet: 5, freeItinerary: 4, facilities: 2, heritage: 4 },
    hub: "/vessels/dahabiya/",
  },
  motor: {
    type: "motor",
    name: "Motor cruise ship",
    short: "The floating hotel",
    line: "A river ship of three to five decks with a restaurant, a lounge and usually a pool. It keeps a set timetable and moors at town quays.",
    nights: "3–4 nights",
    rows: {
      power: "Diesel engines",
      pace: "Fixed timetable: 4 nights Luxor to Aswan, 3 nights back",
      mooring: "Town quays, often several ships side by side",
      sound: "Engines when sailing; neighbours at the quay",
      days: "Early guided visits, afternoons sailing, evenings on board",
      price: "See current prices on each ship",
    },
    meters: { intimacy: 2, quiet: 2, freeItinerary: 1, facilities: 5, heritage: 2 },
    hub: "/vessels/motor-cruise-ships/",
  },
  steam: {
    type: "steam",
    name: "Paddle steamer",
    short: "The period piece",
    line: "One of the few restored historic steamers still on the river: period cabins, wood and brass, and a gentle pace.",
    nights: "Classic Luxor–Aswan route",
    rows: {
      power: "Paddle wheels",
      pace: "Unhurried; the classic Luxor–Aswan route",
      mooring: "Town quays and some quieter stops",
      sound: "Paddles and water",
      days: "Guided visits with a strong sense of period",
      price: "See current prices on each steamer",
    },
    meters: { intimacy: 3, quiet: 3, freeItinerary: 2, facilities: 3, heritage: 5 },
    hub: "/vessels/paddle-steamers/",
  },
};

export type TypeStats = { vessels: number; guests: [number, number] | null; cabins: [number, number] | null };

const range = (r: [number, number] | null) => (r ? (r[0] === r[1] ? `${r[0]}` : `${r[0]}–${r[1]}`) : "Varies by vessel");

/** A profile with the catalogue's figures: the middle half of the vessels of that type (most fall in this range). */
export function profileWithStats(type: VesselType, stats: TypeStats | undefined): VesselProfile {
  const t = VESSEL_TYPE_TEXT[type];
  const guests = range(stats?.guests ?? null);
  return {
    type: t.type,
    name: t.name,
    short: t.short,
    line: t.line,
    meters: t.meters,
    facts: [
      ["users", stats?.guests ? `${guests} guests` : "Guests vary by vessel"],
      ["clock", t.nights],
      ["anchor", t.rows.mooring.split(",")[0]!],
    ],
    rows: { ...t.rows, guests, cabins: range(stats?.cabins ?? null) },
    sample: false,
  };
}
