/**
 * DATA-003: operational dashboards show dates and times in Cairo time (Africa/Cairo), labelled,
 * so an operator in Aswan and an admin abroad read the same clock. Stored values stay UTC.
 */
export const CAIRO = "Africa/Cairo";

export function formatCairo(value: Date | string, { date = true, time = true }: { date?: boolean; time?: boolean } = {}): string {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid date: ${String(value)}`);
  const text = new Intl.DateTimeFormat("en-GB", {
    timeZone: CAIRO,
    ...(date ? { day: "numeric", month: "short", year: "numeric" } : {}),
    ...(time ? { hour: "2-digit", minute: "2-digit", hourCycle: "h23" } : {}),
  }).format(d);
  return time ? `${text.replace(",", "")} Cairo` : text;
}

/** Hours ahead of UTC in Cairo at that moment: 2 in winter, 3 in Egyptian summer time. */
export function cairoOffsetHours(value: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: CAIRO, timeZoneName: "shortOffset" }).formatToParts(value);
  const name = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT+2";
  const m = /GMT([+-]\d+)/.exec(name);
  return m ? Number(m[1]) : 0;
}
