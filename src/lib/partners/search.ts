import { ADULT_AGE, linePrice } from "@/lib/bookings/bookings";
import type { Band } from "@/lib/product/pricing";

/**
 * Partner search (DASH-B2B-001, 002, ADR-092): rows from public.partner_search, grouped by departure and cabin, priced
 * for one cabin's guests with the same rules as offers (children by age bands, infants free, gratuity shown apart).
 */
export type SearchRow = {
  departure_id: string;
  vessel_name: string;
  origin: string;
  destination: string;
  nights: number;
  departs_on: string;
  returns_on: string;
  sailing_period: string | null;
  sails_at: string | null;
  cabin_type_id: string;
  cabin_name: string;
  deck: string;
  max_occupancy: number;
  available: number;
  occupancy: number;
  currency: string;
  amount_minor: number;
  child_bands: Band[];
  gratuity_usd_minor: number | null;
  tier: "company" | "trade" | "public";
};

export const TIER_LABEL = { company: "Your company rate", trade: "Trade rate", public: "Public rate" } as const;

export type PricedCabin = {
  cabinTypeId: string;
  name: string;
  deck: string;
  available: number;
  currency: string;
  /** Price for this cabin's guests, or why it can't be priced. */
  price: { ok: true; totalMinor: number; tier: SearchRow["tier"] } | { ok: false; reason: string };
};
export type SearchDeparture = {
  departureId: string;
  vessel: string;
  route: string;
  nights: number;
  departsOn: string;
  returnsOn: string;
  sailingPeriod: string | null;
  sailsAt: string | null;
  gratuityUsdMinor: number | null;
  cabins: PricedCabin[];
};

export function groupSearch(rows: SearchRow[], guests: { adults: number; childAges: number[] }): SearchDeparture[] {
  const deps = new Map<string, SearchDeparture>();
  const byCabin = new Map<string, SearchRow[]>();
  for (const r of rows) {
    if (!deps.has(r.departure_id))
      deps.set(r.departure_id, {
        departureId: r.departure_id,
        vessel: r.vessel_name,
        route: `${r.origin} → ${r.destination}`,
        nights: r.nights,
        departsOn: r.departs_on,
        returnsOn: r.returns_on,
        sailingPeriod: r.sailing_period,
        sailsAt: r.sails_at,
        gratuityUsdMinor: r.gratuity_usd_minor,
        cabins: [],
      });
    const key = `${r.departure_id}/${r.cabin_type_id}/${r.currency}`;
    byCabin.set(key, [...(byCabin.get(key) ?? []), r]);
  }
  for (const list of byCabin.values()) {
    const first = list[0]!;
    // The tier that priced this party: the one for the occupancy the party fills.
    let tier: SearchRow["tier"] = first.tier;
    const priced = linePrice(
      { adults: guests.adults, childAges: guests.childAges, maxOccupancy: first.max_occupancy },
      (occupancy) => {
        const r = list.find((x) => x.occupancy === occupancy);
        if (!r) return null;
        tier = r.tier;
        return { amountMinor: Number(r.amount_minor), bands: r.child_bands };
      },
    );
    deps.get(first.departure_id)!.cabins.push({
      cabinTypeId: first.cabin_type_id,
      name: first.cabin_name,
      deck: first.deck,
      available: first.available,
      currency: first.currency,
      price: priced.ok ? { ok: true, totalMinor: priced.priceMinor, tier } : { ok: false, reason: priced.reason },
    });
  }
  return [...deps.values()]
    .map((d) => ({ ...d, cabins: d.cabins.sort((a, b) => a.deck.localeCompare(b.deck) || a.name.localeCompare(b.name)) }))
    .sort((a, b) => a.departsOn.localeCompare(b.departsOn) || a.vessel.localeCompare(b.vessel));
}

/** Parse "7, 4" into ages under 18; null when malformed. */
export function parseChildAges(text: string): number[] | null {
  const parts = text.split(/[\s,]+/).filter(Boolean);
  if (parts.some((p) => !/^\d{1,2}$/.test(p) || Number(p) >= ADULT_AGE)) return null;
  return parts.map(Number);
}
