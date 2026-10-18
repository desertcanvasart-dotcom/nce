import { isoWeekday, returnDate } from "@/lib/product/departures";
import { cairoOffsetHours } from "@/lib/time/cairo";

/**
 * Tours and sightseeing (DASH-ADM-058–071, 073, ADR-087). Pure rules shared by the admin screens and the tests;
 * the database enforces the same limits (migration 20261018000900_tours).
 */

export const TOUR_KINDS = [
  { value: "museum_visit", label: "Museum visit" },
  { value: "excursion", label: "Excursion" },
  { value: "evening_tour", label: "Evening tour" },
  { value: "transfer", label: "Transfer" },
  { value: "other", label: "Other" },
] as const;
export type TourKind = (typeof TOUR_KINDS)[number]["value"];
export const TOUR_CURRENCIES = ["USD", "EUR"] as const;
export type SessionKind = "shared" | "private";
export type Pricing = "per_guest" | "per_group";

// ── Cairo time (DATA-003): sessions are entered in Cairo time and stored in UTC ─────────────────────────────
/** "2027-04-30" + "09:30" in Cairo → the UTC instant, across Egyptian summer time. */
export function cairoToUtc(date: string, time: string): Date {
  const naive = Date.parse(`${date}T${time}:00Z`);
  // The offset at the guessed instant, then once more at the corrected one (only differs near a change).
  let utc = naive - cairoOffsetHours(new Date(naive)) * 3_600_000;
  utc = naive - cairoOffsetHours(new Date(utc)) * 3_600_000;
  return new Date(utc);
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
export const MAX_BULK_SESSIONS = 1000;

/** DASH-ADM-067: every chosen weekday between two dates, at each start time; Cairo time in, UTC instants out. */
export function sessionStarts({ from, to, weekdays, times }: { from: string; to: string; weekdays: number[]; times: string[] }): Date[] {
  if (!DATE.test(from) || !DATE.test(to) || to < from) throw new Error("Choose a start and an end date.");
  if (!weekdays.length) throw new Error("Choose at least one weekday.");
  if (!times.length || times.some((t) => !TIME.test(t))) throw new Error("Give start times as HH:MM, for example 06:30.");
  const out = new Map<number, Date>();
  for (let d = new Date(`${from}T00:00:00Z`); d.toISOString().slice(0, 10) <= to; d.setUTCDate(d.getUTCDate() + 1)) {
    const day = d.toISOString().slice(0, 10);
    if (!weekdays.includes(isoWeekday(day))) continue;
    for (const t of times) {
      const start = cairoToUtc(day, t);
      out.set(start.getTime(), start);
      if (out.size > MAX_BULK_SESSIONS) throw new Error(`That would create more than ${MAX_BULK_SESSIONS} sessions. Use a shorter range.`);
    }
  }
  return [...out.values()].sort((a, b) => a.getTime() - b.getTime());
}

/** The Cairo calendar date of an instant (a session's day, for programs). */
export function cairoDate(instant: Date | string): string {
  const d = typeof instant === "string" ? new Date(instant) : instant;
  return new Date(d.getTime() + cairoOffsetHours(d) * 3_600_000).toISOString().slice(0, 10);
}

// ── Cancellation bands (DASH-ADM-065) ──────────────────────────────────────────────────────────────────────
export type CancellationBand = { from_days: number; percent: number };

/** Null when valid; otherwise the problem in plain words. Mirrors app.valid_cancellation_bands. */
export function bandsProblem(bands: CancellationBand[]): string | null {
  if (!bands.length) return null;
  const sorted = [...bands].sort((a, b) => b.from_days - a.from_days);
  for (const b of sorted) {
    if (!Number.isInteger(b.from_days) || b.from_days < 0 || b.from_days > 365) return "Days before the start must be whole numbers from 0 to 365.";
    if (!Number.isInteger(b.percent) || b.percent < 0 || b.percent > 100) return "The charge must be a whole percentage from 0 to 100.";
  }
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i]!.from_days === sorted[i - 1]!.from_days) return "Each band needs a different number of days.";
    if (sorted[i]!.percent < sorted[i - 1]!.percent) return "The charge can’t go down as the start gets closer.";
  }
  if (sorted[sorted.length - 1]!.from_days !== 0) return "Add a band from 0 days, so a late cancellation is covered too.";
  return null;
}

/** The share of the price charged when cancelling `daysBefore` days ahead (used by tour orders in 4f). */
export function cancellationPercent(bands: CancellationBand[], daysBefore: number): number {
  const band = [...bands].sort((a, b) => b.from_days - a.from_days).find((b) => daysBefore >= b.from_days);
  if (!band) throw new Error("No cancellation band covers this date");
  return band.percent;
}

// ── Prices (DASH-ADM-068, 069, ADR-087) ────────────────────────────────────────────────────────────────────
export type SessionPrice = { kind: SessionKind; pricing: Pricing; priceMinor: number; capacity: number };
export type TourQuote = { ok: true; totalMinor: number; paying: number } | { ok: false; reason: string };

/**
 * Per guest: every guest aged 3 or over pays; under-3s are free. Per group: one price for the party.
 * Capacity counts every guest. Adults-only tours take guests of 18 and over.
 */
export function quoteSession(s: SessionPrice, ages: number[], { adultsOnly = false } = {}): TourQuote {
  if (!ages.length) return { ok: false, reason: "Add at least one guest." };
  if (ages.some((a) => !Number.isFinite(a) || a < 0)) return { ok: false, reason: "Every guest needs an age." };
  if (adultsOnly && ages.some((a) => a < 18)) return { ok: false, reason: "This tour is for adults only (18 and over)." };
  if (ages.length > s.capacity) {
    return { ok: false, reason: s.kind === "private" ? `This private session takes up to ${s.capacity} guests.` : `Only ${s.capacity} places.` };
  }
  const paying = ages.filter((a) => a >= 3).length;
  if (s.pricing === "per_group") return { ok: true, totalMinor: s.priceMinor, paying };
  return { ok: true, totalMinor: s.priceMinor * paying, paying };
}

// ── Readiness (DASH-ADM-073) ───────────────────────────────────────────────────────────────────────────────
export type ReadinessInput = {
  published: boolean;
  hasSupplier: boolean;
  bands: CancellationBand[];
  futureSessions: number;
  hasEnglishDescription: boolean;
};
export type Readiness = { state: "draft" | "information" | "bookable"; missing: string[] };

/** Mirrors public.tour_is_bookable; also lists what a bookable tour still needs. */
export function tourReadiness(t: ReadinessInput): Readiness {
  const missing: string[] = [];
  if (!t.hasSupplier) missing.push("a supplier");
  if (!t.bands.length) missing.push("cancellation bands");
  if (!t.futureSessions) missing.push("a future session with a price");
  if (!t.hasEnglishDescription) missing.push("an English description");
  const sellable = t.hasSupplier && t.bands.length > 0 && t.futureSessions > 0;
  return { state: !t.published ? "draft" : sellable ? "bookable" : "information", missing };
}

// ── Programs (DASH-ADM-070, 071) ───────────────────────────────────────────────────────────────────────────
export type ProgramItem = { day_number: number; tour_id: string; tour_name: string };
export type ProgramDeparture = { id: string; departs_on: string; label: string };
export type SessionSlot = { tour_id: string; starts_at: string; capacity: number; status: string };
export type ProgramCheck = {
  departure: ProgramDeparture;
  days: { day_number: number; date: string; tours: { tour_id: string; tour_name: string; sessions: number }[] }[];
  missing: string[];
};

/** Day N of a program falls on the departure date + N − 1. */
export const programDate = (departsOn: string, dayNumber: number) => returnDate(departsOn, dayNumber - 1);

/**
 * For each departure: each included tour needs a scheduled session on its day with at least `guests` places.
 * (Places already taken arrive with tour orders in 4f; until then capacity is what counts.)
 */
export function programAvailability(
  departures: ProgramDeparture[],
  items: ProgramItem[],
  sessions: SessionSlot[],
  guests = 1,
): ProgramCheck[] {
  const byTourDay = new Map<string, number>();
  for (const s of sessions) {
    if (s.status !== "scheduled" || s.capacity < guests) continue;
    const key = `${s.tour_id}/${cairoDate(s.starts_at)}`;
    byTourDay.set(key, (byTourDay.get(key) ?? 0) + 1);
  }
  const dayNumbers = [...new Set(items.map((i) => i.day_number))].sort((a, b) => a - b);
  return departures.map((departure) => {
    const missing: string[] = [];
    const days = dayNumbers.map((n) => {
      const date = programDate(departure.departs_on, n);
      const tours = items
        .filter((i) => i.day_number === n)
        .map((i) => {
          const count = byTourDay.get(`${i.tour_id}/${date}`) ?? 0;
          if (!count) missing.push(`No ${i.tour_name} session on ${date} (day ${n})`);
          return { tour_id: i.tour_id, tour_name: i.tour_name, sessions: count };
        });
      return { day_number: n, date, tours };
    });
    return { departure, days, missing };
  });
}
