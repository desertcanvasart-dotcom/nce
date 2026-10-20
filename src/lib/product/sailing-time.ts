/**
 * PROPOSED-019 (Faris, 19–20 Oct 2026; ADR-091): when on its first day a ship sails. A morning sailing means guests
 * arrive the day before, which changes travel plans (an extra night, sightseeing that day). Mirrors the database rule in
 * migration 20261020000100_sailing_time: morning before 12:00, noon 12:00–15:59, evening from 16:00.
 */
export type SailingPeriod = "morning" | "noon" | "evening";

export const SAILING_PERIODS: { value: SailingPeriod; label: string }[] = [
  { value: "morning", label: "Morning (before 12:00)" },
  { value: "noon", label: "Noon (12:00–15:59)" },
  { value: "evening", label: "Evening (from 16:00)" },
];

const TIME = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

/** The period an exact Cairo time falls in, or null when it isn't a valid HH:MM. */
export function periodOf(time: string): SailingPeriod | null {
  if (!TIME.test(time)) return null;
  const h = Number(time.slice(0, 2));
  return h < 12 ? "morning" : h < 16 ? "noon" : "evening";
}

/** "in the morning (08:00 Cairo time)". */
export function whenText(period: SailingPeriod, time: string | null): string {
  const when = { morning: "in the morning", noon: "around noon", evening: "in the evening" }[period];
  return `${when}${time ? ` (${time.slice(0, 5)} Cairo time)` : ""}`;
}

/** "Sails from Aswan in the morning (08:00 Cairo time)", or null when the operator hasn't said. */
export function sailingTimeText(period: SailingPeriod | null, time: string | null, origin: string): string | null {
  return period ? `Sails from ${origin} ${whenText(period, time)}` : null;
}

/** A morning sailing: guests should arrive the day before. */
export const arriveDayBefore = (period: SailingPeriod | null) => period === "morning";

/** The traveller's tip for a morning sailing. */
export const dayBeforeTip = (origin: string) => `Plan to arrive in ${origin} the day before. That day is free for sightseeing.`;

/** The day before a YYYY-MM-DD date. */
export function dayBefore(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}
