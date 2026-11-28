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
    currency: "EUR",
    notes: "",
  };
};

const PROBLEMS = {
  en: {
    missingDates: "Choose the earliest and latest departure dates.",
    past: "The earliest departure must be after today.",
    order: "The latest departure can't be before the earliest.",
    nights: "Nights are 1 to 21, the shortest no longer than the longest.",
    adults: "At least one adult, and up to 30.",
    cabinRange: "1 to 30 cabins.",
    ageFormat: "Give children's ages as numbers separated by commas, for example 7, 4.",
    childOver: "Children are under 18; count older guests as adults.",
    cabinGuests: "Ask for at least one cabin and no more cabins than guests.",
    cabinAdult: "Each cabin needs a guest aged 12 or over.",
    sleeps: "A cabin sleeps at most 3 (infants under 3 don’t count). Ask for more cabins.",
    budget: "Give the budget as an amount, for example 3000.",
  },
  ja: {
    missingDates: "出発日の範囲（最も早い日と最も遅い日）を選んでください。",
    past: "最も早い出発日は、明日以降にしてください。",
    order: "最も遅い出発日は、最も早い出発日より前にできません。",
    nights: "泊数は1〜21泊で、最少泊数は最多泊数以下にしてください。",
    adults: "大人は1名以上30名以下にしてください。",
    cabinRange: "客室は1〜30室にしてください。",
    ageFormat: "お子様の年齢はカンマで区切った数字で入力してください（例：7, 4）。",
    childOver: "お子様は18歳未満です。18歳以上の方は大人として数えてください。",
    cabinGuests: "客室は1室以上で、人数を超えない数にしてください。",
    cabinAdult: "各客室には12歳以上の方が1名必要です。",
    sleeps: "1室の定員は3名までです（3歳未満の幼児は数えません）。客室を増やしてください。",
    budget: "予算は金額で入力してください（例：3000）。",
  },
};

/** What's wrong with the plan, in the request form's own words; empty when it can be sent. */
export function planProblems(p: Plan, today: string, locale: string = "en"): string[] {
  const out: string[] = [];
  const say = PROBLEMS[locale === "ja" ? "ja" : "en"];
  const day = /^\d{4}-\d{2}-\d{2}$/;
  if (!day.test(p.earliest) || !day.test(p.latest)) out.push(say.missingDates);
  else if (p.earliest <= today) out.push(say.past);
  else if (p.latest < p.earliest) out.push(say.order);
  if (!(p.nightsMin >= 1 && p.nightsMax <= 21 && p.nightsMin <= p.nightsMax)) out.push(say.nights);
  if (!(p.adults >= 1 && p.adults <= 30)) out.push(say.adults);
  if (!(p.cabins >= 1 && p.cabins <= 30)) out.push(say.cabinRange);
  if (p.childAges.trim() && !/^\s*\d{1,2}(\s*,\s*\d{1,2})*\s*$/.test(p.childAges)) out.push(say.ageFormat);
  else if (p.childAges.split(",").some((a) => a.trim() && Number(a) >= 18)) out.push(say.childOver);
  // The request form's cabin rules (lib/bookings), so a plan never fails after sign-up.
  const ages = /^\s*\d{1,2}(\s*,\s*\d{1,2})*\s*$/.test(p.childAges) ? p.childAges.split(",").map(Number) : [];
  if (p.cabins > p.adults + ages.length) out.push(say.cabinGuests);
  else if (p.cabins > p.adults + ages.filter((a) => a >= 12).length) out.push(say.cabinAdult);
  if (p.adults + ages.filter((a) => a >= 3).length > p.cabins * 3) out.push(say.sleeps);
  if (p.budget.trim() && !/^\d+([.,]\d{1,2})?$/.test(p.budget.trim().replace(/,(?=\d{3})/g, ""))) out.push(say.budget);
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
