/**
 * DASH-ADM-051: which dates a schedule sails. Mirrors public.generate_departures (the database creates the rows);
 * this preview tells operators what will be created before they press the button.
 */
export type Period = { starts_on: string; ends_on: string };

const iso = (d: Date) => d.toISOString().slice(0, 10);
const day = (s: string) => new Date(`${s}T00:00:00Z`);
/** ISO weekday: 1 = Monday … 7 = Sunday. */
export const isoWeekday = (s: string) => ((day(s).getUTCDay() + 6) % 7) + 1;

export function sailingDates(sailingDays: number[], periods: Period[], from: string, horizon: string): string[] {
  const out = new Set<string>();
  for (const p of periods) {
    const start = p.starts_on > from ? p.starts_on : from;
    const end = p.ends_on < horizon ? p.ends_on : horizon;
    for (let d = day(start); iso(d) <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      if (sailingDays.includes(isoWeekday(iso(d)))) out.add(iso(d));
    }
  }
  return [...out].sort();
}

export function returnDate(departsOn: string, nights: number): string {
  const d = day(departsOn);
  d.setUTCDate(d.getUTCDate() + nights);
  return iso(d);
}

export const WEEKDAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 7, label: "Sunday" },
] as const;

/** Today and a horizon N days ahead, as ISO dates (UTC). Kept out of components so renders stay pure. */
export function dateWindow(days: number, from?: string): { today: string; until: string } {
  const now = Date.now();
  const start = from ? Date.parse(`${from}T00:00:00Z`) : now;
  return { today: iso(new Date(now)), until: iso(new Date(start + days * 86_400_000)) };
}
export const nowMs = () => Date.now();
