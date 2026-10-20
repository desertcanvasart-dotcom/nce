/**
 * Tour booking by calendar (Batch 7-2, ADR-097). Mirrors app.tour_slot_price in the database.
 * Tours have rates, not pre-made sessions: the customer picks a date and start time, a mode and the party.
 *   shared   per person; adults 12+, children 6–11 and 3–5 at their own prices, under-3s free; at most 8 per slot
 *   private  per person by party size (guests 3 and over count), children 3–11 at a percentage
 *   transfer per vehicle, one way: the smallest vehicle that seats everyone; a night extra 22:00–06:00
 *   assist   per party, by party size
 * Seasons raise or lower the price by a percentage between two dates. Amounts are US cents.
 */
export type TourMode = "shared" | "private" | "transfer" | "assist";

export type TourRate =
  | { mode: "shared"; adult: number; child611: number; child35: number; maxGuests: number; minGuests: number }
  | { mode: "private"; tiers: { min: number; max: number | null; pp: number }[]; childPct: number }
  | { mode: "transfer"; vehicles: { name: string; max: number; price: number }[]; nightExtra: number }
  | { mode: "assist"; tiers: { max: number; price: number }[] };

export type Season = { from: string; to: string; pct: number; applies: "all" | "shared" | "private" | "transfers" };

export type Quote = { ok: true; total: number; lines: string[]; vehicle?: string } | { ok: false; problem: string };

/** ADR-097: parties of 9 or more book private; a shared slot takes at most 8. */
export const SHARED_MAX = 8;
export const PRIVATE_FROM = 9;

const usd = (cents: number) => `US$${(cents / 100).toLocaleString("en", { maximumFractionDigits: 0 })}`;
const isNight = (time: string) => {
  const h = Number(time.slice(0, 2));
  return h >= 22 || h < 6;
};

/** The season percentage that applies to a mode on a date (the largest, if seasons overlap). */
export function seasonPct(seasons: Season[], mode: TourMode, day: string): number {
  const group = mode === "transfer" || mode === "assist" ? "transfers" : mode;
  const hits = seasons.filter((s) => s.from <= day && day <= s.to && (s.applies === "all" || s.applies === group));
  return hits.length ? Math.max(...hits.map((s) => s.pct)) : 0;
}

export function quoteTour(rate: TourRate, ages: number[], day: string, time: string, seasons: Season[] = []): Quote {
  if (!ages.length) return { ok: false, problem: "Add at least one guest." };
  if (!ages.some((a) => a >= 12)) return { ok: false, problem: "Each booking needs a guest aged 12 or over." };
  let total = 0;
  const lines: string[] = [];
  let vehicle: string | undefined;
  if (rate.mode === "shared") {
    if (ages.length >= PRIVATE_FROM) return { ok: false, problem: `Parties of ${PRIVATE_FROM} or more book the private tour.` };
    if (ages.length > rate.maxGuests) return { ok: false, problem: `A shared group takes at most ${rate.maxGuests} guests.` };
    for (const a of ages) {
      const p = a >= 12 ? rate.adult : a >= 6 ? rate.child611 : a >= 3 ? rate.child35 : 0;
      total += p;
    }
    const adults = ages.filter((a) => a >= 12).length;
    lines.push(`${adults} × ${usd(rate.adult)} per adult`);
    if (ages.length > adults) lines.push("children by age; under 3 free");
  } else if (rate.mode === "private") {
    const party = ages.filter((a) => a >= 3).length;
    const tier = rate.tiers.find((t) => party >= t.min && (t.max === null || party <= t.max));
    if (!tier) return { ok: false, problem: "There is no private price for this party size." };
    for (const a of ages) total += a >= 12 ? tier.pp : a >= 3 ? Math.round((tier.pp * rate.childPct) / 100) : 0;
    lines.push(`${usd(tier.pp)} per adult for a party of ${party}`);
  } else if (rate.mode === "transfer") {
    const v = [...rate.vehicles].sort((a, b) => a.max - b.max).find((x) => x.max >= ages.length);
    if (!v) return { ok: false, problem: "No vehicle seats this many guests: send a request instead." };
    total = v.price + (isNight(time) ? rate.nightExtra : 0);
    vehicle = v.name;
    lines.push(`${v.name}, one way`);
    if (isNight(time) && rate.nightExtra) lines.push(`night extra ${usd(rate.nightExtra)}`);
  } else {
    const t = [...rate.tiers].sort((a, b) => a.max - b.max).find((x) => x.max >= ages.length);
    if (!t) return { ok: false, problem: "There is no price for a party this size." };
    total = t.price;
    lines.push(`per party of up to ${t.max}`);
  }
  const pct = seasonPct(seasons, rate.mode, day);
  if (pct) {
    total = Math.round(total * (1 + pct / 100));
    lines.push(`${pct > 0 ? "+" : ""}${pct} % for the season`);
  }
  return { ok: true, total, lines, vehicle };
}

/** ADR-097: bookable from the lead time (24 hours by default) up to 12 months ahead, on the days the tour runs. */
export function openDays(opts: { today: string; days: number[]; leadHours: number; nowHour: number }): string[] {
  const out: string[] = [];
  const start = new Date(`${opts.today}T00:00:00Z`);
  for (let i = 0; i <= 365; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    const iso = d.toISOString().slice(0, 10);
    const dow = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
    // A day opens once even its earliest start is at least the lead time away (counted from now, in whole days).
    if (i * 24 - opts.nowHour < opts.leadHours) continue;
    if (opts.days.includes(dow)) out.push(iso);
  }
  return out;
}

/** Places left on a shared slot: 8 less the guests already booked or held. Private bookings never fill it. */
export const placesLeft = (max: number, booked: number) => Math.max(0, max - booked);

/** ADR-097: the standard tour cancellation when a tour sets none: free until 48 hours before, then 100 %. */
export const STANDARD_TOUR_BANDS = [
  { from_days: 2, percent: 0 },
  { from_days: 0, percent: 100 },
];
