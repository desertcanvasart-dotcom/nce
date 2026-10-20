import { dayBefore } from "@/lib/product/sailing-time";

/**
 * Where the customer's ship is on each day of their cruise, for the tour calendar (Faris, 21 Oct: "make it clear for
 * the customer where exactly he is on which day"). The place comes from the day's title in the itinerary (the first
 * known place it names); without one, day 1 is the start and the last day the end of the route. A morning sailing
 * (PROPOSED-019) adds the day before: guests arrive then, in the start city.
 */
export type CruiseDay = { date: string; place: string | null; label: string; reference: string; vessel: string };
export type Sailing = {
  reference: string;
  vessel: string;
  departsOn: string;
  returnsOn: string;
  origin: string;
  destination: string;
  morning: boolean;
  /** English day titles by day number, from the itinerary. */
  titles: Record<number, string>;
};

const PLACES = ["Luxor", "Esna", "El Kab", "Edfu", "Gebel Silsila", "Kom Ombo", "Aswan", "Abu Simbel", "Dendera", "Abydos"];

/** The first known place a day's title names, by where it appears ("Edfu and Kom Ombo" → Edfu). */
export function placeIn(title: string): string | null {
  const t = title.toLowerCase();
  const hits = PLACES.map((p) => [p, t.indexOf(p.toLowerCase())] as const).filter(([, i]) => i >= 0);
  return hits.length ? hits.sort((a, b) => a[1] - b[1])[0]![0] : null;
}

const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

export function cruiseDays(s: Sailing): CruiseDay[] {
  const out: CruiseDay[] = [];
  const base = { reference: s.reference, vessel: s.vessel };
  if (s.morning) {
    out.push({
      ...base,
      date: dayBefore(s.departsOn),
      place: placeIn(s.origin) ?? s.origin,
      label: `Arrive in ${s.origin}: your cruise sails the next morning`,
    });
  }
  const last = Math.round((Date.parse(s.returnsOn) - Date.parse(s.departsOn)) / 86_400_000);
  for (let d = 0; d <= last; d++) {
    const title = s.titles[d + 1];
    const fallback = d === 0 ? s.origin : d === last ? s.destination : null;
    const place = (title ? placeIn(title) : null) ?? (fallback ? (placeIn(fallback) ?? fallback) : null);
    out.push({ ...base, date: addDays(s.departsOn, d), place, label: `Day ${d + 1}: ${title ?? place ?? "on the river"}` });
  }
  return out;
}

/** Is the ship in the tour's place that day? ("Aswan" tours, "Luxor–Aswan" programs.) */
export const shipIn = (day: CruiseDay, location: string) =>
  day.place !== null && location.toLowerCase().includes(day.place.toLowerCase());
