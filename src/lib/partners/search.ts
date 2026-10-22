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
  /** Cabins bookable instantly (allotment or instant data); null when the operator confirms first (ADR-100). */
  available: number | null;
  occupancy: number;
  currency: string;
  amount_minor: number;
  child_bands: Band[];
  gratuity_usd_minor: number | null;
  tier: "company" | "trade" | "public";
  booking_mode: "instant" | "request";
  operator_org_id: string;
  /** ADR-103: compulsory supplements per adult on this sailing, in this currency. */
  supplement_minor: number;
  /** ADR-103: when the operator's availability was last confirmed. */
  confirmed_at: string | null;
};

export const TIER_LABEL = { company: "Your company rate", trade: "Trade rate", public: "Public rate" } as const;

export type PricedCabin = {
  cabinTypeId: string;
  name: string;
  deck: string;
  available: number | null;
  mode: "instant" | "request";
  operatorOrgId: string;
  currency: string;
  /** Price for this cabin's guests, or why it can't be priced; the total includes the supplements. */
  price: { ok: true; totalMinor: number; supplementMinor: number; tier: SearchRow["tier"] } | { ok: false; reason: string };
  confirmedAt: string | null;
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
    const line = { adults: guests.adults, childAges: guests.childAges, maxOccupancy: first.max_occupancy };
    const priced = linePrice(line, (occupancy) => {
      const r = list.find((x) => x.occupancy === occupancy);
      if (!r) return null;
      tier = r.tier;
      return { amountMinor: Number(r.amount_minor), bands: r.child_bands };
    });
    // ADR-103: supplements per guest with the same age bands as the fare, as the database prices them.
    const supp = Number(first.supplement_minor ?? 0);
    const extra =
      priced.ok && supp > 0
        ? linePrice(line, (occupancy) => {
            const r = list.find((x) => x.occupancy === occupancy);
            return r ? { amountMinor: supp, bands: r.child_bands } : null;
          })
        : null;
    const supplementMinor = extra?.ok ? extra.priceMinor : 0;
    deps.get(first.departure_id)!.cabins.push({
      cabinTypeId: first.cabin_type_id,
      name: first.cabin_name,
      deck: first.deck,
      available: first.available,
      mode: first.booking_mode,
      operatorOrgId: first.operator_org_id,
      currency: first.currency,
      price: priced.ok
        ? { ok: true, totalMinor: priced.priceMinor + supplementMinor, supplementMinor, tier }
        : { ok: false, reason: priced.reason },
      confirmedAt: first.confirmed_at,
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
