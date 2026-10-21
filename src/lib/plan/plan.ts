/**
 * PAGE-105, DASH-PUB-007 (ADR-101): a cruise plan a visitor makes without an account. It stays in their browser; sending
 * it opens the request form with every field filled in (after sign-in), where they check it and send it to operators.
 */
export type Plan = {
  route: string;
  earliest: string;
  latest: string;
  nightsMin: number;
  nightsMax: number;
  adults: number;
  childAges: string;
  cabins: number;
  budget: string;
  currency: "USD" | "EUR" | "EGP";
  notes: string;
};

export const STORAGE_KEY = "nc-plan-v1";

export const emptyPlan = (today: string): Plan => {
  const d = (n: number) => new Date(Date.parse(`${today}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
  return {
    route: "",
    earliest: d(30),
    latest: d(60),
    nightsMin: 3,
    nightsMax: 7,
    adults: 2,
    childAges: "",
    cabins: 1,
    budget: "",
    currency: "USD",
    notes: "",
  };
};

/** What's wrong with the plan, in the request form's own words; empty when it can be sent. */
export function planProblems(p: Plan, today: string): string[] {
  const out: string[] = [];
  const day = /^\d{4}-\d{2}-\d{2}$/;
  if (!day.test(p.earliest) || !day.test(p.latest)) out.push("Choose the earliest and latest departure dates.");
  else if (p.earliest <= today) out.push("The earliest departure must be after today.");
  else if (p.latest < p.earliest) out.push("The latest departure can't be before the earliest.");
  if (!(p.nightsMin >= 1 && p.nightsMax <= 21 && p.nightsMin <= p.nightsMax))
    out.push("Nights are 1 to 21, the shortest no longer than the longest.");
  if (!(p.adults >= 1 && p.adults <= 30)) out.push("At least one adult, and up to 30.");
  if (!(p.cabins >= 1 && p.cabins <= 30)) out.push("1 to 30 cabins.");
  if (p.childAges.trim() && !/^\s*\d{1,2}(\s*,\s*\d{1,2})*\s*$/.test(p.childAges))
    out.push("Give children's ages as numbers separated by commas, for example 7, 4.");
  else if (p.childAges.split(",").some((a) => a.trim() && Number(a) >= 18))
    out.push("Children are under 18; count older guests as adults.");
  // The request form's cabin rules (lib/bookings), so a plan never fails after sign-up.
  const ages = /^\s*\d{1,2}(\s*,\s*\d{1,2})*\s*$/.test(p.childAges) ? p.childAges.split(",").map(Number) : [];
  if (p.cabins > p.adults + ages.length) out.push("Ask for at least one cabin and no more cabins than guests.");
  else if (p.cabins > p.adults + ages.filter((a) => a >= 12).length) out.push("Each cabin needs a guest aged 12 or over.");
  if (p.adults + ages.filter((a) => a >= 3).length > p.cabins * 3)
    out.push("A cabin sleeps at most 3 (infants under 3 don’t count). Ask for more cabins.");
  if (p.budget.trim() && !/^\d+([.,]\d{1,2})?$/.test(p.budget.trim().replace(/,(?=\d{3})/g, "")))
    out.push("Give the budget as an amount, for example 3000.");
  return out;
}

/** The request form's address, with the plan as its query (the form reads these as its defaults). */
export function requestHref(p: Plan): string {
  const q = new URLSearchParams({
    ...(p.route ? { route: p.route } : {}),
    from: p.earliest,
    to: p.latest,
    nmin: String(p.nightsMin),
    nmax: String(p.nightsMax),
    adults: String(p.adults),
    ...(p.childAges.trim() ? { children: p.childAges.replace(/\s+/g, "") } : {}),
    cabins: String(p.cabins),
    ...(p.budget.trim() ? { budget: p.budget.trim(), cur: p.currency } : {}),
    ...(p.notes.trim() ? { notes: p.notes.trim().slice(0, 1000) } : {}),
  });
  return `/dashboard/journey/requests/?${q.toString()}#new`;
}

/** A saved plan read back safely (anything malformed is ignored). */
export function readPlan(raw: string | null, today: string): Plan | null {
  if (!raw) return null;
  try {
    const p = { ...emptyPlan(today), ...(JSON.parse(raw) as Partial<Plan>) };
    return typeof p.earliest === "string" && typeof p.adults === "number" ? p : null;
  } catch {
    return null;
  }
}
