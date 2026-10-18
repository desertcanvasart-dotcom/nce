import { fitsCabin, guestPrice, type Band } from "@/lib/product/pricing";

/**
 * Requests, offers and reservations (DASH-CUS-014, DASH-OPR-017–023, DASH-BND-001, DATA-020, ADR-088).
 * Pure rules shared by the screens and the tests; the database checks the same things again when an offer is sent
 * and when it is accepted (migration 20261018001000).
 */

export const ADULT_AGE = 18;
export const EXPIRY = { defaultHours: 72, minHours: 24, maxHours: 336 } as const;

// ── Requests (DASH-CUS-014, DATA-020) ──────────────────────────────────────────────────────────────────
export type RequestInput = {
  earliest_departure: string;
  latest_departure: string;
  latest_finish: string | null;
  nights_min: number;
  nights_max: number;
  adults: number;
  child_ages: number[];
  cabins: number;
};

const addDays = (date: string, n: number) => new Date(Date.parse(`${date}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/** What is wrong with a request, in plain words (empty when it can be sent). `today` is the Cairo date. */
export function requestProblems(r: RequestInput, today: string): string[] {
  const p: string[] = [];
  if (r.earliest_departure <= today) p.push("The earliest departure must be after today.");
  if (r.latest_departure < r.earliest_departure) p.push("The latest departure can’t be before the earliest one.");
  if (r.latest_departure > addDays(r.earliest_departure, 366)) p.push("Keep the travel window within a year.");
  if (r.nights_max < r.nights_min) p.push("The longest stay can’t be shorter than the shortest.");
  if (r.nights_min < 1 || r.nights_max > 21) p.push("Cruises last 1 to 21 nights.");
  if (r.latest_finish && r.latest_finish < addDays(r.earliest_departure, r.nights_min)) {
    p.push("With these dates and nights, no cruise could finish by the latest finish date.");
  }
  if (r.adults < 1) p.push("At least one adult travels.");
  if (r.child_ages.some((a) => !Number.isInteger(a) || a < 0 || a >= ADULT_AGE)) p.push("Children’s ages are whole years from 0 to 17.");
  const guests = r.adults + r.child_ages.length;
  if (r.cabins < 1 || r.cabins > guests) p.push("Ask for at least one cabin and no more cabins than guests.");
  // Every cabin needs someone aged 12 or over (fitsCabin), and a cabin sleeps at most 3 (infants don't count).
  const grownUps = r.adults + r.child_ages.filter((a) => a >= 12).length;
  if (r.cabins > grownUps) p.push("Each cabin needs a guest aged 12 or over.");
  if (r.adults + r.child_ages.filter((a) => a >= 3).length > r.cabins * 3) p.push("A cabin sleeps at most 3 (infants under 3 don’t count). Ask for more cabins.");
  return p;
}

// ── Offer price build-up (DASH-OPR-018) ─────────────────────────────────────────────────────────────────
export type CabinLine = { adults: number; childAges: number[]; maxOccupancy: number };
/** Per-person adult rate for an occupancy (guests aged 3+ in the cabin), in the offer's plan and currency. */
export type RateLookup = (occupancy: number) => { amountMinor: number; bands: Band[] } | null;
export type LinePrice = { ok: true; priceMinor: number; occupancy: number; perGuest: number[] } | { ok: false; reason: string };

/**
 * One cabin: adults pay the per-person rate for the cabin's occupancy; children pay their band's share of it by age
 * on the departure date (ADR-012); under-3s are free and don't count towards occupancy.
 */
export function linePrice(line: CabinLine, rate: RateLookup): LinePrice {
  const ages = [...Array(line.adults).fill(ADULT_AGE), ...line.childAges];
  const fit = fitsCabin(ages, line.maxOccupancy);
  if (!fit.ok) return { ok: false, reason: fit.reason! };
  const occupancy = ages.filter((a) => a >= 3).length;
  const r = rate(occupancy);
  if (!r) return { ok: false, reason: `There is no rate for ${occupancy} guest${occupancy === 1 ? "" : "s"} in this cabin type.` };
  const perGuest = ages.map((a) => (a >= ADULT_AGE ? r.amountMinor : guestPrice(r.amountMinor, a, r.bands)));
  return { ok: true, priceMinor: perGuest.reduce((s, x) => s + x, 0), occupancy, perGuest };
}

/** The guests an offer's cabins hold must be exactly the request's guests (the database checks this too). */
export function sameGuests(lines: { adults: number; childAges: number[] }[], request: { adults: number; child_ages: number[] }): boolean {
  const adults = lines.reduce((s, l) => s + l.adults, 0);
  const kids = lines.flatMap((l) => l.childAges).sort((a, b) => a - b);
  return adults === request.adults && kids.join(",") === [...request.child_ages].sort((a, b) => a - b).join(",");
}

// ── Offer state (DASH-OPR-023, DASH-CUS-007) ────────────────────────────────────────────────────────────
export type OfferStatus = "sent" | "superseded" | "withdrawn" | "accepted" | "closed";
export type OfferView = "open" | "expired" | "superseded" | "withdrawn" | "accepted" | "closed";

export function offerView(o: { status: OfferStatus; expires_at: string }, now: number): OfferView {
  if (o.status === "sent") return Date.parse(o.expires_at) > now ? "open" : "expired";
  return o.status;
}

export const canAccept = (o: { status: OfferStatus; expires_at: string }, now: number) => offerView(o, now) === "open";

export function expiryProblem(hours: number): string | null {
  if (!Number.isInteger(hours) || hours < EXPIRY.minHours || hours > EXPIRY.maxHours) return "An offer is valid for 24 hours to 14 days.";
  return null;
}

// ── Passengers at acceptance (ADR-088, DATA-020) ────────────────────────────────────────────────────────
export type Passenger = { full_name: string; date_of_birth: string; nationality?: string };

/** Ages on the departure date must match the offer: the same number of adults and the same children's ages. */
export function passengersProblem(
  passengers: Passenger[],
  departsOn: string,
  offered: { adults: number; childAges: number[] },
  ageOn: (dob: string, on: string) => number,
): string | null {
  const total = offered.adults + offered.childAges.length;
  if (passengers.length !== total) return `Give the name and date of birth of all ${total} guests.`;
  if (passengers.some((p) => p.full_name.trim().length < 2 || !/^\d{4}-\d{2}-\d{2}$/.test(p.date_of_birth))) {
    return "Every guest needs a full name and a date of birth.";
  }
  const ages = passengers.map((p) => ageOn(p.date_of_birth, departsOn));
  if (ages.some((a) => a < 0)) return "A date of birth is after the departure.";
  const adults = ages.filter((a) => a >= ADULT_AGE).length;
  const kids = ages.filter((a) => a < ADULT_AGE).sort((a, b) => a - b);
  if (adults !== offered.adults || kids.join(",") !== [...offered.childAges].sort((a, b) => a - b).join(",")) {
    return `On the departure date this offer is for ${offered.adults} adult${offered.adults === 1 ? "" : "s"}${
      offered.childAges.length ? ` and children aged ${[...offered.childAges].sort((a, b) => a - b).join(", ")}` : ""
    }. Check the dates of birth, or ask the operator for an updated offer.`;
  }
  const nat = passengers[0]?.nationality?.trim();
  if (nat && !/^[A-Za-z]{2}$/.test(nat)) return "Give the lead passenger’s nationality as a two-letter country code, such as GB.";
  return null;
}

// ── The bookable gate, explained (DASH-BND-001) ─────────────────────────────────────────────────────────
export type GateInput = {
  vesselPublished: boolean;
  operatorApproved: boolean;
  departureScheduled: boolean;
  departsOn: string;
  today: string;
  hasPolicy: boolean;
  sellableCabinTypes: number; // active, with a rate and fresh availability above zero
};

/** Mirrors public.departure_bookable and says what is missing. */
export function gateProblems(g: GateInput): string[] {
  const p: string[] = [];
  if (!g.vesselPublished) p.push("the vessel isn’t published");
  if (!g.operatorApproved) p.push("the operator’s access isn’t active");
  if (!g.departureScheduled) p.push("the departure is cancelled");
  if (g.departsOn <= g.today) p.push("the departure date has passed");
  if (!g.hasPolicy) p.push("there is no cancellation policy");
  if (!g.sellableCabinTypes) p.push("no cabin type has a rate and confirmed availability");
  return p;
}
