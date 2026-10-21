/**
 * Pricing rules decided by Faris (ADR-010, ADR-012, ADR-018, ADR-082). All money is integer minor units.
 * Quotes for bookings (4e) are built from these functions; they are unit-tested at every boundary.
 */
export type Band = { from: number; to: number | null; percent: number };
export type RatePlan = "international" | "egyptian_citizen" | "foreign_resident" | "trade";

/** DATA-019 defaults: under 3 free; 3–5.99 25%; 6–11.99 50%; 12+ full. Same values as platform_settings. */
export const DEFAULT_CHILD_BANDS: Band[] = [
  { from: 0, to: 3, percent: 0 },
  { from: 3, to: 6, percent: 25 },
  { from: 6, to: 12, percent: 50 },
  { from: 12, to: null, percent: 100 },
];

/** Completed years on the departure date (ADR-012: the age that counts is the age on the departure date). */
export function ageOn(birthDate: string, onDate: string): number {
  const [by, bm, bd] = birthDate.split("-").map(Number) as [number, number, number];
  const [y, m, d] = onDate.split("-").map(Number) as [number, number, number];
  let age = y - by;
  if (m < bm || (m === bm && d < bd)) age--;
  return age;
}

export function sharePercent(age: number, bands: Band[] = DEFAULT_CHILD_BANDS): number {
  const band = bands.find((b) => age >= b.from && (b.to === null || age < b.to));
  if (!band) throw new Error(`No child band covers age ${age}`);
  return band.percent;
}

/** Bands must cover every age from 0 without gaps or overlaps, end open, with shares 0–100 (DATA-022 overrides). */
export function validBands(bands: Band[]): boolean {
  if (!bands.length || bands[0]!.from !== 0 || bands.at(-1)!.to !== null) return false;
  return bands.every((b, i) => {
    const next = bands[i + 1];
    const okShare = Number.isInteger(b.percent) && b.percent >= 0 && b.percent <= 100;
    const okRange = b.to === null ? i === bands.length - 1 : b.to > b.from && (!next || next.from === b.to);
    return okShare && okRange;
  });
}

const roundHalfUp = (n: number) => Math.floor(n + 0.5);

/** One guest's price from the adult per-person rate. */
export function guestPrice(adultRateMinor: number, age: number, bands: Band[] = DEFAULT_CHILD_BANDS): number {
  return roundHalfUp((adultRateMinor * sharePercent(age, bands)) / 100);
}

/**
 * DATA-023: occupancy is per cabin type (1–3). Children share a parent's cabin; an infant under 3 does not count.
 * A cabin needs at least one adult (12+).
 */
export function fitsCabin(ages: number[], maxOccupancy: number): { ok: boolean; reason?: string } {
  if (!ages.some((a) => a >= 12)) return { ok: false, reason: "A cabin needs at least one adult." };
  const counted = ages.filter((a) => a >= 3).length;
  if (counted > maxOccupancy) return { ok: false, reason: `This cabin sleeps ${maxOccupancy}; infants under 3 don't count.` };
  return { ok: true };
}

/**
 * DATA-015 / ADR-010: the crew gratuity, US$ per person per night for guests aged 3 and over, paid on board.
 * It is shown separately and never added to the booking total.
 */
export const MIN_GRATUITY_USD_MINOR = 500;
export function gratuityUsdMinor(perPersonPerNightMinor: number, nights: number, ages: number[]): number {
  if (perPersonPerNightMinor < MIN_GRATUITY_USD_MINOR) throw new Error("The gratuity is at least US$5 per person per night.");
  return perPersonPerNightMinor * nights * ages.filter((a) => a >= 3).length;
}

/** ADR-082: E£ only for the Egyptian-citizen and foreign-resident plans. */
export function currenciesFor(plan: RatePlan): ("USD" | "EUR" | "EGP")[] {
  return plan === "egyptian_citizen" || plan === "foreign_resident" ? ["USD", "EUR", "EGP"] : ["USD", "EUR"];
}

export const RATE_PLANS: { value: RatePlan; label: string }[] = [
  { value: "international", label: "International" },
  { value: "egyptian_citizen", label: "Egyptian citizen" },
  { value: "foreign_resident", label: "Foreign resident in Egypt" },
  { value: "trade", label: "Trade" },
];

/** Promotions (DASH-ADM-074–078): the discounted per-person amount; never below zero; extras and upgrades keep the price. */
export type Promotion =
  | { kind: "percent"; percent: number }
  | { kind: "fixed"; amountMinor: number; currency: string }
  | { kind: "extra" }
  | { kind: "upgrade" };

export function promotedPrice(rateMinor: number, currency: string, p: Promotion): number {
  switch (p.kind) {
    case "percent":
      if (!(p.percent > 0 && p.percent < 100)) throw new Error("A percentage discount is between 0 and 100.");
      return rateMinor - roundHalfUp((rateMinor * p.percent) / 100);
    case "fixed":
      if (p.currency !== currency) throw new Error("A fixed discount applies only to rates in its own currency.");
      return Math.max(0, rateMinor - p.amountMinor);
    default:
      return rateMinor;
  }
}

/**
 * ADR-079, ADR-095, ADR-099: is availability recent enough to reserve? Defaults; admins change them on Admin → Settings.
 * `tap` is an operator's answer to a booking request; `sheet` a vacancy sheet Nilecruz read and confirmed.
 */
export const FRESHNESS_HOURS: Record<"manual" | "paste" | "feed" | "api" | "tap" | "sheet", number> = {
  manual: 168,
  paste: 168,
  feed: 2,
  api: 2,
  tap: 2,
  sheet: 168,
};
/** "2 hours", "24 hours", "7 days": a freshness threshold in words. */
export function hoursText(h: number): string {
  if (h >= 48 && h % 24 === 0) return `${h / 24} days`;
  return `${h} ${h === 1 ? "hour" : "hours"}`;
}

export function isFresh(
  confirmedAt: string,
  source: keyof typeof FRESHNESS_HOURS,
  now = Date.now(),
  hours: Record<keyof typeof FRESHNESS_HOURS, number> = FRESHNESS_HOURS,
): boolean {
  return now - Date.parse(confirmedAt) < hours[source] * 3_600_000;
}
