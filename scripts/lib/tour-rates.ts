/**
 * ADR-097: check and convert the rate sheet's rows (scripts/tour-rates.py) into tour rates, offices and seasons.
 * Pure, so the unit tests run it on a sheet's rows. Dollars become cents; percentages written as 0.5 or 50 both work.
 */
export type SheetRow = { row: number } & Record<string, string | number | boolean | null>;
export type Sheet = Record<
  "Shared tours" | "Private tours" | "Transfers" | "Meet and assist" | "Seasons" | "Questions",
  SheetRow[]
> & {
  /** ADR-102: older sheets have no Programs tab. */
  Programs?: SheetRow[];
};
export type KnownTour = { id: string; name: string };
export type Office = { id: string; display_name: string };

export type RatePlan = {
  tour_id: string;
  mode: "shared" | "private" | "transfer" | "assist" | "program";
  label: string;
  days: number[];
  start_times: string[];
  lead_hours: number;
  max_guests: number;
  min_guests: number;
  tickets_included: boolean | null;
  prices: Record<string, unknown>;
};
/** ADR-102: a programme goes with the itineraries its name gives ("3-Night …: Aswan to Luxor"); admins can change them. */
export type ProgrammeLink = { tour_id: string; nights: number; origin: string; destination: string };
export type SeasonPlan = { name: string; starts_on: string; ends_on: string; pct: number; applies: string };

const DAY = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export function parseDays(v: unknown): number[] | null {
  const t = String(v ?? "every day")
    .trim()
    .toLowerCase();
  if (!t || /^(every ?day|daily|all)$/.test(t)) return [1, 2, 3, 4, 5, 6, 7];
  const out = new Set<number>();
  for (const part of t.split(/[,;/]|\band\b/)) {
    const p = part.trim();
    if (!p) continue;
    const range = /^([a-z]{3})[a-z]*\s*[-–to ]+\s*([a-z]{3})[a-z]*$/.exec(p);
    if (range) {
      const a = DAY.indexOf(range[1]!);
      const b = DAY.indexOf(range[2]!);
      if (a < 0 || b < 0) return null;
      for (let i = a; ; i = (i + 1) % 7) {
        out.add(i + 1);
        if (i === b) break;
      }
      continue;
    }
    const d = DAY.indexOf(p.slice(0, 3));
    if (d < 0) return null;
    out.add(d + 1);
  }
  return out.size ? [...out].sort() : null;
}

export function parseTimes(v: unknown): string[] | null {
  const t = String(v ?? "").trim();
  if (!t || /^flex/i.test(t)) return [];
  const out = t.split(/[,;]|\band\b/).map((x) => x.trim());
  if (out.some((x) => !/^([01]\d|2[0-3])[:.][0-5]\d$/.test(x))) return null;
  return [...new Set(out.map((x) => x.replace(".", ":")))].sort();
}

const pct = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(Math.abs(n) <= 1 ? n * 100 : n) : NaN;
};

export function planTourRates(sheet: Sheet, tours: KnownTour[], offices: Office[]) {
  const problems: string[] = [];
  const rates: RatePlan[] = [];
  const officeOf = new Map<string, string>();
  const byName = new Map(tours.map((t) => [t.name.trim().toLowerCase(), t.id]));
  const where = (tab: string, r: SheetRow) => `${tab}, row ${r.row}`;
  const cents = (tab: string, r: SheetRow, key: string, label: string, required = false): number | null => {
    const v = r[key];
    if (v === null || v === undefined || v === "") {
      if (required) problems.push(`${where(tab, r)}: ${label} is empty`);
      return null;
    }
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) {
      problems.push(`${where(tab, r)}: ${label} should be a price in US$, not "${String(v)}"`);
      return null;
    }
    return Math.round(n * 100);
  };
  const common = (tab: string, r: SheetRow, mode: RatePlan["mode"]) => {
    const tourId = byName.get(String(r.tour ?? "").toLowerCase());
    if (!tourId) {
      problems.push(`${where(tab, r)}: no tour is called "${String(r.tour)}" (names must match the tours list)`);
      return null;
    }
    const office = offices.find((o) =>
      o.display_name.toLowerCase().includes(
        String(r.office ?? "")
          .toLowerCase()
          .trim(),
      ),
    );
    if (!r.office || !office) problems.push(`${where(tab, r)}: office "${String(r.office ?? "")}" should be Luxor or Aswan`);
    else if (officeOf.has(tourId) && officeOf.get(tourId) !== office.id)
      problems.push(`${where(tab, r)}: ${String(r.tour)} has two different offices`);
    else officeOf.set(tourId, office.id);
    const days = parseDays(mode === "transfer" || mode === "assist" ? "every day" : r.days);
    if (!days) problems.push(`${where(tab, r)}: days "${String(r.days)}" should be "Every day" or like "Mon, Wed, Fri"`);
    const times = parseTimes(mode === "transfer" || mode === "assist" ? "" : r.times);
    if (!times) problems.push(`${where(tab, r)}: start times "${String(r.times)}" should be like "08:00, 13:00" or "flexible"`);
    const lead = r.lead === null || r.lead === undefined ? (mode === "transfer" || mode === "assist" ? 12 : 24) : Number(r.lead);
    if (!Number.isInteger(lead) || lead < 0 || lead > 720)
      problems.push(`${where(tab, r)}: "book at least" should be whole hours, not "${String(r.lead)}"`);
    return { tour_id: tourId, days: days ?? [], start_times: times ?? [], lead_hours: lead };
  };

  for (const r of sheet["Shared tours"]) {
    const c = common("Shared tours", r, "shared");
    const adult = cents("Shared tours", r, "adult", "the adult price", true);
    const max = r.max === null ? 8 : Number(r.max);
    const min = r.min === null ? 1 : Number(r.min);
    if (!Number.isInteger(max) || max < 1 || max > 8)
      problems.push(`Shared tours, row ${r.row}: a shared group takes 1 to 8 guests`);
    if (!Number.isInteger(min) || min < 1 || min > max)
      problems.push(`Shared tours, row ${r.row}: the minimum should be 1 to ${max}`);
    if (!c || adult === null || !adult) continue;
    rates.push({
      ...c,
      mode: "shared",
      label: "",
      max_guests: max,
      min_guests: min,
      tickets_included: r.tickets === null ? null : /^y/i.test(String(r.tickets)),
      prices: {
        adult,
        child611: cents("Shared tours", r, "child611", "the child 6–11 price") ?? adult,
        child35: cents("Shared tours", r, "child35", "the child 3–5 price") ?? 0,
      },
    });
  }

  const TIERS: [string, number, number | null][] = [
    ["p1", 1, 1],
    ["p2", 2, 2],
    ["p34", 3, 4],
    ["p58", 5, 8],
    ["p914", 9, 14],
    ["p15", 15, null],
  ];
  for (const r of sheet["Private tours"]) {
    const c = common("Private tours", r, "private");
    const tiers = TIERS.flatMap(([k, min, max]) => {
      const pp = cents("Private tours", r, k, `the price for ${max === null ? `${min}+` : min === max ? min : `${min}–${max}`}`);
      return pp ? [{ min, max, pp }] : [];
    });
    if (!tiers.length) problems.push(`Private tours, row ${r.row}: no party-size prices`);
    // Faris, 21 Oct: children 6–11 pay 50 % unless the sheet says otherwise; 3–5 pay 25 %.
    const child = r.child_pct === null ? 50 : pct(r.child_pct);
    if (!(child >= 0 && child <= 100)) problems.push(`Private tours, row ${r.row}: the child percentage should be 0 to 100 %`);
    if (!c || !tiers.length) continue;
    rates.push({
      ...c,
      mode: "private",
      label: "",
      max_guests: 8,
      min_guests: 1,
      tickets_included: null,
      prices: { tiers, child_pct: child, child35_pct: 25 },
    });
  }

  for (const [tab, mode, sizes] of [
    [
      "Transfers",
      "transfer",
      [
        ["car", "Car", 3],
        ["van", "Van", 8],
        ["minibus", "Minibus", 14],
      ],
    ],
    [
      "Meet and assist",
      "assist",
      [
        ["t14", "", 4],
        ["t58", "", 8],
        ["t914", "", 14],
      ],
    ],
  ] as const) {
    for (const r of sheet[tab]) {
      const c = common(tab, r, mode);
      const label = String(r.label ?? "").trim();
      if (!label) problems.push(`${tab}, row ${r.row}: say the direction (from → to, or arrival or departure)`);
      const priced = sizes.flatMap(([k, name, max]) => {
        const price = cents(tab, r, k, `the ${name || `up to ${max}`} price`);
        return price ? [{ name, max, price }] : [];
      });
      if (!priced.length) problems.push(`${tab}, row ${r.row}: no prices`);
      if (!c || !label || !priced.length) continue;
      rates.push({
        ...c,
        mode,
        label,
        max_guests: 8,
        min_guests: 1,
        tickets_included: null,
        prices:
          mode === "transfer"
            ? { vehicles: priced, night_extra: cents(tab, r, "night", "the night extra") ?? 0 }
            : { tiers: priced.map(({ max, price }) => ({ max, price })) },
      });
    }
  }

  // ADR-102: the Programs tab. A programme runs with its sailing (no days or start times of its own), entrance fees
  // included, children 3–5 at 25 % and 6–11 at the sheet's percentage (50 % unless it says otherwise).
  const programmes: ProgrammeLink[] = [];
  for (const r of sheet.Programs ?? []) {
    const where = `Programs, row ${r.row}`;
    const tourId = byName.get(String(r.tour ?? "").toLowerCase());
    if (!tourId) problems.push(`${where}: no tour is called "${String(r.tour)}" (names must match the tours list)`);
    // "Aswan + Luxor": the first office named handles it (Nilecruz admins handle programme orders).
    const names = String(r.office ?? "")
      .toLowerCase()
      .split(/\s*(?:\+|,|&|\/|\band\b)\s*/)
      .filter(Boolean);
    const office = names.map((n) => offices.find((o) => o.display_name.toLowerCase().includes(n))).find(Boolean);
    if (!office) problems.push(`${where}: offices "${String(r.office ?? "")}" should name Luxor or Aswan`);
    const tiers = TIERS.filter(([k]) => k !== "p15").flatMap(([k, min, max]) => {
      const pp = cents("Programs", r, k, `the price for ${min === max ? min : `${min}–${max}`}`);
      return pp ? [{ min, max, pp }] : [];
    });
    if (!tiers.length) problems.push(`${where}: no party-size prices`);
    const child = r.child_pct === null || r.child_pct === undefined ? 50 : pct(r.child_pct);
    if (!(child >= 0 && child <= 100)) problems.push(`${where}: the child percentage should be 0 to 100 %`);
    if (!tourId || !office || !tiers.length) continue;
    if (officeOf.has(tourId) && officeOf.get(tourId) !== office.id)
      problems.push(`${where}: ${String(r.tour)} has two different offices`);
    else officeOf.set(tourId, office.id);
    rates.push({
      tour_id: tourId,
      mode: "program",
      label: "",
      days: [1, 2, 3, 4, 5, 6, 7],
      start_times: [],
      lead_hours: 24,
      max_guests: 8,
      min_guests: 1,
      tickets_included: true,
      prices: { tiers, child_pct: child, child35_pct: 25 },
    });
    const m = /(\d+)-night\b.*:\s*(.+?)\s+to\s+(.+?)\s*$/i.exec(String(r.tour));
    if (m) programmes.push({ tour_id: tourId, nights: Number(m[1]), origin: m[2]!, destination: m[3]! });
  }

  const seasons: SeasonPlan[] = [];
  for (const r of sheet.Seasons) {
    const p = pct(r.pct);
    const applies = String(r.applies ?? "all").toLowerCase();
    const from = String(r.from ?? "");
    const to = String(r.to ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || to < from)
      problems.push(`Seasons, row ${r.row}: dates should be like 2026-12-24, the end on or after the start`);
    else if (!p || p < -50 || p > 200) problems.push(`Seasons, row ${r.row}: the change should be between -50 % and 200 %`);
    else if (!["all", "shared", "private", "transfers"].includes(applies))
      problems.push(`Seasons, row ${r.row}: "applies to" should be All, Shared, Private or Transfers`);
    else seasons.push({ name: String(r.name), starts_on: from, ends_on: to, pct: p, applies });
  }

  const dupes = new Set<string>();
  for (const x of rates) {
    const k = `${x.tour_id}/${x.mode}/${x.label}`;
    if (dupes.has(k)) problems.push(`Two ${x.mode} rows for the same tour${x.label ? ` and direction (${x.label})` : ""}`);
    dupes.add(k);
  }
  const answers = sheet.Questions.map((q) => `${String(q.n)}. ${String(q.question)} → ${String(q.answer)}`);
  return { rates, seasons, offices: officeOf, programmes, problems, answers };
}
