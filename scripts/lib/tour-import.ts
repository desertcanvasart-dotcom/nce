/**
 * The tours and extras from nilecruz.com/tours (CONTENT-NEEDED #39), as private drafts for an admin to review and publish.
 * Faris's rules (19 Oct 2026): sightseeing programs include no meet and assist and no airport transfers (sold separately);
 * airport transfers are private only.
 */
export type SourceTour = {
  slug: string;
  source: string;
  kind: "museum_visit" | "excursion" | "evening_tour" | "transfer" | "other";
  name: string;
  location: string;
  duration_minutes: number;
  description: string;
  itinerary: string[];
  inclusions: string[];
  exclusions: string[];
  meeting_point: string;
};

export type TourPlan = {
  tours: { slug: string; kind: SourceTour["kind"]; name: string; location: string; duration_minutes: number }[];
  translations: Map<string, Omit<SourceTour, "slug" | "source" | "kind" | "name" | "location" | "duration_minutes">>;
  problems: string[];
};

const KINDS = new Set(["museum_visit", "excursion", "evening_tour", "transfer", "other"]);
const isProgram = (t: SourceTour) => /sightseeing/i.test(t.name);

export function planTourImport(records: SourceTour[]): TourPlan {
  const problems: string[] = [];
  const seen = new Set<string>();
  const plan: TourPlan = { tours: [], translations: new Map(), problems };
  for (const t of records) {
    const where = t.slug || t.name;
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(t.slug)) problems.push(`${where}: the slug isn't lower-case words joined by hyphens`);
    if (seen.has(t.slug)) problems.push(`${where}: duplicate slug`);
    seen.add(t.slug);
    if (!KINDS.has(t.kind)) problems.push(`${where}: unknown kind ${t.kind}`);
    if (!t.name.trim() || t.name.length > 160) problems.push(`${where}: the name must be 1–160 characters`);
    if (!t.location.trim() || t.location.length > 120) problems.push(`${where}: the location must be 1–120 characters`);
    if (!Number.isInteger(t.duration_minutes) || t.duration_minutes < 15 || t.duration_minutes > 20160)
      problems.push(`${where}: the duration must be 15 minutes to 14 days`);
    if (t.description.length > 6000) problems.push(`${where}: the description is over 6,000 characters`);
    if (t.meeting_point.length > 1500) problems.push(`${where}: the meeting point is over 1,500 characters`);
    for (const k of ["itinerary", "inclusions", "exclusions"] as const)
      if (t[k].length > 30) problems.push(`${where}: more than 30 ${k} lines`);
    if (isProgram(t) && t.inclusions.some((x) => /meet and assist|airport/i.test(x)))
      problems.push(`${where}: a sightseeing program can't include meet and assist or airport transfers (sold separately)`);
    if (t.kind === "transfer" && !/private/i.test(t.name)) problems.push(`${where}: airport transfers are sold private only`);
    plan.tours.push({ slug: t.slug, kind: t.kind, name: t.name, location: t.location, duration_minutes: t.duration_minutes });
    plan.translations.set(t.slug, {
      description: t.description,
      itinerary: t.itinerary,
      inclusions: t.inclusions,
      exclusions: t.exclusions,
      meeting_point: t.meeting_point,
    });
  }
  return plan;
}
