/**
 * "Find your route" on /nile-cruise-guide/ (PAGE-002, Islam's guide brief of 4 Nov 2026): three questions, one route.
 * Nights and travel style choose the route (the brief's table); the time of year only adds a note under it.
 */
export type PlannerQuestion = "nights" | "style" | "season";

export const PLANNER: { id: PlannerQuestion; answers: string[] }[] = [
  { id: "nights", answers: ["upTo3", "four", "fiveOrMore"] },
  { id: "style", answers: ["schedule", "slow"] },
  { id: "season", answers: ["winter", "shoulder", "summer", "unsure"] },
];

export type PlannerRoute = "aswanToLuxor" | "luxorToAswan" | "esnaToAswan";

/** Each route's guide article and the cruise list that matches it (an existing facet page). */
export const PLANNER_ROUTES: Record<PlannerRoute, { article: string; listing: string }> = {
  aswanToLuxor: { article: "/nile-cruise-guide/routes/aswan-to-luxor/", listing: "/cruises/aswan-to-luxor/" },
  luxorToAswan: { article: "/nile-cruise-guide/routes/luxor-to-aswan/", listing: "/cruises/luxor-to-aswan/" },
  esnaToAswan: { article: "/nile-cruise-guide/routes/esna-to-aswan/", listing: "/cruises/dahabiyas/" },
};

/** The brief's six results, by nights and travel style; `text` is the message key of the result's wording. */
const RESULTS: Record<string, { route: PlannerRoute; text: string }> = {
  "upTo3/schedule": { route: "aswanToLuxor", text: "upTo3Schedule" },
  "upTo3/slow": { route: "aswanToLuxor", text: "upTo3Slow" },
  "four/schedule": { route: "luxorToAswan", text: "fourSchedule" },
  "four/slow": { route: "luxorToAswan", text: "fourSlow" },
  "fiveOrMore/schedule": { route: "luxorToAswan", text: "fiveOrMoreSchedule" },
  "fiveOrMore/slow": { route: "esnaToAswan", text: "fiveOrMoreSlow" },
};

export type PlannerResult = { route: PlannerRoute; text: string; season: string };

/** The result once every question is answered, else null. */
export function planRoute(answers: Partial<Record<PlannerQuestion, string>>): PlannerResult | null {
  const { nights, style, season } = answers;
  if (!nights || !style || !season) return null;
  const r = RESULTS[`${nights}/${style}`];
  return r && PLANNER[2]!.answers.includes(season) ? { ...r, season } : null;
}
