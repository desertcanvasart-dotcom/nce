/**
 * The vessel page's sailing-dates calendar, kept free of I/O so it is unit-tested. A ship's dates come two ways: rows in
 * `departures` (confirmed, or cancelled) and a weekly pattern (`schedules.sailing_days` inside `schedule_periods`). The
 * pattern is only what the operator usually runs: it is shown, never booked. A date that has a departure row is shown
 * as that row, never as the pattern. Tailor-made vessels have neither, and the calendar is not shown for them.
 */

const DAY = 86_400_000;
const add = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
/** ISO weekday, 1 = Monday … 7 = Sunday, as in `schedules.sailing_days`. */
const isoDow = (d: string) => ((new Date(`${d}T00:00:00Z`).getUTCDay() + 6) % 7) + 1;

export type CalendarItinerary = {
  code: string;
  origin: string;
  destination: string;
  nights: number;
  /** ISO weekdays the operator usually sails on. */
  sailingDays: number[];
  periods: { startsOn: string; endsOn: string }[];
  /** Future departure rows, cancelled ones included. */
  sailings: { id: string; departsOn: string; returnsOn: string; status: "scheduled" | "cancelled" }[];
  /** Its period is the coming twelve months, assumed from its usual weekdays (withUsualYear), not one it was given. */
  rolling?: boolean;
};

export type SailingStatus = "confirmed" | "pattern" | "cancelled";
/** Upstream (south, towards Aswan) or downstream (north, towards Luxor); null off the classic stretch. */
export type Heading = "south" | "north" | null;

export type CalendarSailing = {
  /** The departure row; null for a date from the weekly pattern. */
  id: string | null;
  code: string;
  origin: string;
  destination: string;
  nights: number;
  departsOn: string;
  returnsOn: string;
  status: SailingStatus;
  heading: Heading;
};

export type PatternLine = {
  code: string;
  origin: string;
  destination: string;
  nights: number;
  days: number[];
  periods: { startsOn: string; endsOn: string }[];
  heading: Heading;
};

// The river from north to south; Abu Simbel is reached across Lake Nasser, beyond Aswan.
const RIVER = ["cairo", "dendera", "luxor", "esna", "edfu", "kom ombo", "aswan", "abu simbel"];

export function headingOf(origin: string, destination: string): Heading {
  const a = RIVER.indexOf(origin.trim().toLowerCase());
  const b = RIVER.indexOf(destination.trim().toLowerCase());
  return a < 0 || b < 0 || a === b ? null : a < b ? "south" : "north";
}

/** The last day of the twelfth month from today's: the calendar's horizon, like the season calendar's (EXP-006). */
export function horizonOf(today: string): string {
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7)) - 1 + 12;
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

/** Every sailing after today up to the horizon: departure rows first, then the pattern's dates that have no row. */
export function calendarSailings(its: CalendarItinerary[], today: string): CalendarSailing[] {
  const end = horizonOf(today);
  const out: CalendarSailing[] = [];
  for (const it of its) {
    const base = {
      code: it.code,
      origin: it.origin,
      destination: it.destination,
      nights: it.nights,
      heading: headingOf(it.origin, it.destination),
    };
    const rows = new Set<string>();
    for (const s of it.sailings) {
      rows.add(s.departsOn);
      if (s.departsOn <= today || s.departsOn > end) continue;
      out.push({
        ...base,
        id: s.id,
        departsOn: s.departsOn,
        returnsOn: s.returnsOn,
        status: s.status === "scheduled" ? "confirmed" : "cancelled",
      });
    }
    const days = new Set(it.sailingDays);
    for (const p of it.periods) {
      const last = p.endsOn < end ? p.endsOn : end;
      for (let d = p.startsOn > today ? p.startsOn : add(today, 1); d <= last; d = add(d, 1)) {
        if (!days.has(isoDow(d)) || rows.has(d)) continue;
        rows.add(d);
        out.push({ ...base, id: null, departsOn: d, returnsOn: add(d, it.nights), status: "pattern" });
      }
    }
  }
  return out.sort((a, b) => a.departsOn.localeCompare(b.departsOn) || a.code.localeCompare(b.code));
}

/** The weekly patterns still running after today, in words on the page. */
export function patternLines(its: CalendarItinerary[], today: string): PatternLine[] {
  return its
    .filter((it) => it.sailingDays.length && (it.rolling || it.periods.some((p) => p.endsOn > today)))
    .map((it) => ({
      code: it.code,
      origin: it.origin,
      destination: it.destination,
      nights: it.nights,
      days: [...new Set(it.sailingDays)].sort((a, b) => a - b),
      // An assumed year has no dates to state: the line gives the weekdays only.
      periods: it.rolling ? [] : it.periods.filter((p) => p.endsOn > today).sort((a, b) => a.startsOn.localeCompare(b.startsOn)),
      heading: headingOf(it.origin, it.destination),
    }));
}

/**
 * An itinerary with usual weekdays but no period still running and no departure rows (the luxury ships: their
 * import sets weekdays only) is drawn for the coming twelve months, as expected dates, until real dates arrive
 * (Islam, 5 Nov 2026). Its line on the page gives the weekdays, not an invented period.
 */
export function withUsualYear(its: CalendarItinerary[], today: string): CalendarItinerary[] {
  const end = horizonOf(today);
  return its.map((it) =>
    it.sailingDays.length && !it.sailings.length && !it.periods.some((p) => p.endsOn > today)
      ? { ...it, periods: [{ startsOn: today, endsOn: end }], rolling: true }
      : it,
  );
}

/**
 * The usual sailing days of itineraries that have them but no period still running, so no dates can be drawn: what
 * the operator usually runs, to show instead of "no sailing dates" (the luxury ships carry weekdays only).
 */
export function usualLines(its: CalendarItinerary[], today: string): PatternLine[] {
  const drawn = new Set(patternLines(its, today).map((l) => l.code));
  return its
    .filter((it) => !drawn.has(it.code) && it.sailingDays.length)
    .map((it) => ({
      code: it.code,
      origin: it.origin,
      destination: it.destination,
      nights: it.nights,
      days: [...new Set(it.sailingDays)].sort((a, b) => a - b),
      periods: [],
      heading: headingOf(it.origin, it.destination),
    }));
}

/** "yyyy-mm" from today's month to the last month with a sailing; none without sailings. */
export function calendarMonths(sailings: CalendarSailing[], today: string): string[] {
  const last = sailings.at(-1)?.departsOn.slice(0, 7);
  if (!last) return [];
  const out: string[] = [];
  for (let m = today.slice(0, 7); m <= last;) {
    out.push(m);
    const [y, mm] = m.split("-").map(Number) as [number, number];
    m = mm === 12 ? `${y + 1}-01` : `${y}-${String(mm + 1).padStart(2, "0")}`;
  }
  return out;
}

/** A month's days, and how many blank cells come before the 1st in a Monday-first week. */
export function monthDays(month: string): { offset: number; days: string[] } {
  const first = `${month}-01`;
  const days: string[] = [];
  for (let d = first; d.startsWith(month); d = add(d, 1)) days.push(d);
  return { offset: isoDow(first) - 1, days };
}

/**
 * The nights on board, by date: the line under the calendar's days. A night belongs to the sailing that left on or
 * before it and checks out after it; a confirmed sailing wins over the pattern. Cancelled sailings have no nights.
 */
export function nightsOnBoard(sailings: CalendarSailing[]): Map<string, CalendarSailing> {
  const out = new Map<string, CalendarSailing>();
  for (const s of sailings) {
    if (s.status === "cancelled") continue;
    for (let d = s.departsOn; d < s.returnsOn; d = add(d, 1)) {
      const was = out.get(d);
      if (!was || (was.status === "pattern" && s.status === "confirmed")) out.set(d, s);
    }
  }
  return out;
}
