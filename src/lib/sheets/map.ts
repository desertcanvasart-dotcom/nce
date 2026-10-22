/**
 * ADR-099, Part B: turn what a vacancy sheet says ("MS Sample Star · 2 Nov · Deluxe Upper · 3 free") into Nilecruz
 * format v1 rows for the operator's own ships and cabin types. Names match exactly (after tidying), by the ship's or
 * cabin type's name, slug or code, or by an alias an admin saved before. Nothing is guessed: a name that doesn't match is
 * flagged in the preview for an admin to map, and the mapping is saved as a new alias.
 */
export type SheetRow = { ship: string; date: string; cabin: string; available: number };
export type OperatorShip = {
  slug: string;
  name: string;
  cabinCount: number | null;
  cabins: { code: string; name: string; cabinCount?: number | null }[];
};
export type Alias = { kind: "vessel" | "cabin"; sheet_name: string; target: string; vessel_slug: string | null };

export type MappedRow =
  | { vessel: string; date: string; cabin: string; available: number; label: string }
  | { unmapped: true; date: string; available: number; label: string; sheet_ship: string; sheet_cabin: string; vessel?: string };
export type Unmatched = { kind: "vessel" | "cabin"; name: string; vessel_slug?: string };

/** "M/S Sample Star", "ms sample-star" and "Sample Star" all tidy to "sample star". */
export function tidy(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/^(m\/?s|m\.s\.|mv|m\/y|ss|the)\s+/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function mapRows(
  rows: SheetRow[],
  ships: OperatorShip[],
  aliases: Alias[],
): { rows: MappedRow[]; unmatched: Unmatched[] } {
  const shipBy = new Map<string, OperatorShip>();
  for (const s of ships) for (const k of [s.name, s.slug]) shipBy.set(tidy(k), s);
  for (const a of aliases.filter((a) => a.kind === "vessel")) {
    const s = ships.find((x) => x.slug === a.target);
    if (s) shipBy.set(tidy(a.sheet_name), s);
  }
  const cabinOf = (s: OperatorShip, name: string): string | undefined => {
    const t = tidy(name);
    const alias = aliases.find((a) => a.kind === "cabin" && a.vessel_slug === s.slug && tidy(a.sheet_name) === t);
    if (alias && s.cabins.some((c) => c.code === alias.target)) return alias.target;
    return s.cabins.find((c) => tidy(c.name) === t || tidy(c.code) === t)?.code;
  };
  const unmatched = new Map<string, Unmatched>();
  const out: MappedRow[] = rows.map((r) => {
    const label = `${r.ship} · ${r.cabin}`;
    const ship = shipBy.get(tidy(r.ship));
    if (!ship) {
      unmatched.set(`vessel:${tidy(r.ship)}`, { kind: "vessel", name: r.ship });
      return { unmapped: true, date: r.date, available: r.available, label, sheet_ship: r.ship, sheet_cabin: r.cabin };
    }
    const code = cabinOf(ship, r.cabin);
    if (!code) {
      unmatched.set(`cabin:${ship.slug}:${tidy(r.cabin)}`, { kind: "cabin", name: r.cabin, vessel_slug: ship.slug });
      return {
        unmapped: true,
        date: r.date,
        available: r.available,
        label,
        sheet_ship: r.ship,
        sheet_cabin: r.cabin,
        vessel: ship.slug,
      };
    }
    return { vessel: ship.slug, date: r.date, cabin: code, available: r.available, label };
  });
  return { rows: out, unmatched: [...unmatched.values()] };
}

/**
 * Auto-confirm (off by default; an admin switches it on after 4 clean imports) only when every check passes. Any
 * problem leaves the sheet waiting in the preview.
 */
export function autoConfirmProblems(input: {
  operatorKnown: boolean;
  /** How the sheet arrived; emailed sheets always wait for an admin (SEC-011). */
  channel?: "email" | "whatsapp" | "upload";
  unmatched: number;
  rows: MappedRow[];
  ships: OperatorShip[];
  /** Share of the operator's coming sailings whose availability the sheet changes, 0–1. */
  changedShare: number;
  sheetDate: string | null;
  /** The newest time we hold availability for this operator (ISO), if any. */
  latestDataAt: string | null;
}): string[] {
  const problems: string[] = [];
  if (!input.operatorKnown) problems.push("The sender isn't a known contact of an operator.");
  // An email's From address can be forged; WhatsApp senders are vouched for by Meta's signature.
  if (input.channel === "email") problems.push("Emailed sheets are confirmed by an admin: an email's sender can be forged.");
  if (input.unmatched > 0)
    problems.push(`${input.unmatched} name${input.unmatched === 1 ? "" : "s"} not mapped by an existing alias.`);
  const total = new Map(input.ships.map((s) => [s.slug, s.cabinCount]));
  // ADR-103: a cabin type's own count, where the operator gave one.
  const ofType = new Map(input.ships.flatMap((s) => s.cabins.map((c) => [`${s.slug}/${c.code}`, c.cabinCount ?? null])));
  const perSailing = new Map<string, number>();
  for (const r of input.rows) {
    if ("unmapped" in r) continue;
    const max = total.get(r.vessel);
    const typeMax = ofType.get(`${r.vessel}/${r.cabin}`);
    if (typeMax && r.available > typeMax)
      problems.push(`${r.label} on ${r.date}: ${r.available} free is more than the ${typeMax} cabins of this type.`);
    else if (max && r.available > max)
      problems.push(`${r.label} on ${r.date}: ${r.available} free is more than the ship's ${max} cabins.`);
    const k = `${r.vessel}/${r.date}`;
    perSailing.set(k, (perSailing.get(k) ?? 0) + r.available);
  }
  for (const [k, n] of perSailing) {
    const max = total.get(k.split("/")[0]!);
    if (max && n > max) problems.push(`${k.replace("/", " on ")}: ${n} free in all is more than the ship's ${max} cabins.`);
  }
  if (input.changedShare >= 0.3)
    problems.push(`The sheet changes ${Math.round(input.changedShare * 100)} % of sailings (30 % or more).`);
  if (!input.sheetDate) problems.push("The sheet has no date.");
  else if (input.latestDataAt && input.sheetDate <= input.latestDataAt.slice(0, 10))
    problems.push("The sheet isn't newer than the availability Nilecruz already holds for this operator.");
  return problems;
}
