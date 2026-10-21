/**
 * DASH-PUB-011, 012 (ADR-101): the read-only tools assistants such as ChatGPT or Claude can call through MCP. They see
 * what a visitor without an account sees: vessels, evaluations, itineraries, the one public "from" price and each
 * sailing's booking mode, never per-sailing prices or cabin counts. Nothing here can book, request or change anything.
 * Free of I/O so it is unit-tested; the data comes in through `McpData`.
 */
import { z } from "zod";
import type { ListingVessel } from "@/lib/marketplace/listing";
import { COMPARE_MAX } from "@/lib/marketplace/listing";
import type { VesselPage } from "@/lib/marketplace/vessel";
import { sightseeingText, VERDICT_TEXT } from "@/lib/marketplace/vessel";

export type SailingMode = { scheduleId: string; departsOn: string; returnsOn: string; mode: string };

export type McpData = {
  listing: () => Promise<ListingVessel[]>;
  vessel: (slug: string) => Promise<VesselPage | null>;
  sailings: (vesselId: string) => Promise<SailingMode[]>;
  site: string;
};

const TYPE_TEXT = { sail: "dahabiya (sailing boat)", motor: "motor ship", steam: "paddle steamer" } as const;
const MODE_TEXT: Record<string, string> = {
  instant: "Instant confirmation",
  request: "Confirmed by the operator after you ask (usually within hours)",
  sold_out: "Sold out",
  unconfirmed: "To be confirmed: ask Nilecruz",
};
const SIGHTSEEING_BY = {
  vessel: "the vessel, in its own price",
  nilecruz: "Nilecruz's sightseeing programme, a separate booking paid with the cruise",
} as const;
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "a date as yyyy-mm-dd");
const slug = z.string().regex(/^[a-z0-9-]{1,120}$/, "a vessel's slug, as search_cruises gives it");

const money = (m: { amount: number; currency: string } | undefined) =>
  m ? { amount: m.amount / 100, currency: m.currency, note: "from, per person, the lowest public price" } : null;

const vesselUrl = (site: string, s: string) => `${site}/cruises/${s}/`;

// ── The tools ─────────────────────────────────────────────────────────────────────────────────────────────────
const searchInput = z
  .object({
    origin: z.string().max(80).optional(),
    destination: z.string().max(80).optional(),
    from: day.optional(),
    to: day.optional(),
    nights_min: z.number().int().min(1).max(21).optional(),
    nights_max: z.number().int().min(1).max(21).optional(),
    vessel_type: z.enum(["sail", "motor", "steam"]).optional(),
    guests: z.number().int().min(1).max(30).optional(),
  })
  .strict();

async function searchCruises(a: z.infer<typeof searchInput>, d: McpData) {
  const like = (place: string, want?: string) => !want || place.toLowerCase().includes(want.trim().toLowerCase());
  const results = [];
  for (const v of await d.listing()) {
    if (a.vessel_type && v.type !== a.vessel_type) continue;
    if (a.guests && v.maxGuests && a.guests > v.maxGuests) continue;
    const its = v.itineraries
      .filter((i) => like(i.origin, a.origin) && like(i.destination, a.destination))
      .filter((i) => (!a.nights_min || i.nights >= a.nights_min) && (!a.nights_max || i.nights <= a.nights_max))
      .map((i) => ({
        ...i,
        departures: i.departures.filter((x) => (!a.from || x >= a.from) && (!a.to || x <= a.to)),
      }))
      .filter((i) => !(a.from || a.to) || i.departures.length);
    if (!its.length) continue;
    results.push({
      name: v.name,
      slug: v.slug,
      type: TYPE_TEXT[v.type],
      evaluation: v.evaluation ?? null,
      from_price: v.bookable ? money(v.from) : null,
      // ADR-102: the vessel's own price with sightseeing, where Nilecruz approved it to sell that way.
      from_price_with_sightseeing: v.bookable ? money(v.fromWithSightseeing) : null,
      sightseeing_by: v.bookable && v.fromWithSightseeing ? SIGHTSEEING_BY[v.sightseeingBy ?? "vessel"] : null,
      bookable_on_nilecruz: v.bookable,
      itineraries: its.map((i) => ({
        route: `${i.origin} to ${i.destination}`,
        nights: i.nights,
        next_departures: i.departures.slice(0, 6),
      })),
      url: vesselUrl(d.site, v.slug),
    });
  }
  results.sort((x, y) => Number(y.bookable_on_nilecruz) - Number(x.bookable_on_nilecruz) || x.name.localeCompare(y.name));
  return {
    count: results.length,
    vessels: results.slice(0, 20),
    note: "Prices are the public 'from' price per person; the exact price for a party is shown on Nilecruz after signing in.",
    search_url: `${d.site}/cruises/`,
  };
}

const vesselInput = z.object({ slug }).strict();

function facts(v: VesselPage, site: string) {
  return {
    name: v.name,
    slug: v.slug,
    type: TYPE_TEXT[v.type],
    category: v.category,
    guests: v.maxGuests,
    cabins: v.cabinCount,
    decks: v.deckCount,
    year_built: v.yearBuilt,
    summary: v.summary,
    evaluation: v.evaluation
      ? {
          score: v.evaluation.score,
          verdict: VERDICT_TEXT[v.evaluation.verdict],
          assessed_on: v.evaluation.assessedOn,
          by: "Nilecruz's own evaluation (ADR-009), not guest reviews",
        }
      : null,
    from_price: v.bookable ? money(v.from) : null,
    from_price_with_sightseeing: v.bookable ? money(v.fromWithSightseeing) : null,
    sightseeing_by: v.bookable && v.fromWithSightseeing ? SIGHTSEEING_BY[v.sightseeingBy ?? "vessel"] : null,
    // DATA-016: paid on board, never online and never in a price.
    gratuity:
      v.gratuityUsdMinor === null
        ? null
        : { amount: v.gratuityUsdMinor / 100, currency: "USD", note: "per person, paid on board at check-out" },
    cabin_types: v.cabins.map((c) => ({ name: c.name, deck: c.deck, size_m2: c.sizeM2, sleeps: c.maxOccupancy, view: c.view })),
    bookable_on_nilecruz: v.bookable,
    url: vesselUrl(site, v.slug),
  };
}

async function getVessel(a: z.infer<typeof vesselInput>, d: McpData) {
  const v = await d.vessel(a.slug);
  if (!v) return null;
  return {
    ...facts(v, d.site),
    itineraries: v.itineraries.map((i) => ({
      route: `${i.origin} to ${i.destination}`,
      nights: i.nights,
      days: i.days.map((x) => ({ day: x.day, title: x.title })),
      sightseeing_with_the_vessel: i.sightseeing ? sightseeingText(i.sightseeing) : null,
      sightseeing_with_nilecruz: i.programme
        ? { programme: i.programme.name, from_per_person_for_two: money({ amount: i.programme.ppForTwoMinor, currency: "USD" }) }
        : null,
      next_departures: i.departures.slice(0, 6),
    })),
  };
}

const compareInput = z.object({ slugs: z.array(slug).min(2).max(COMPARE_MAX) }).strict();

async function compareVessels(a: z.infer<typeof compareInput>, d: McpData) {
  const found = (await Promise.all([...new Set(a.slugs)].map((s) => d.vessel(s)))).filter((v): v is VesselPage => !!v);
  return {
    vessels: found.map((v) => facts(v, d.site)),
    not_found: a.slugs.filter((s) => !found.some((v) => v.slug === s)),
    url: `${d.site}/cruises/compare/?${found.map((v) => `v=${encodeURIComponent(v.slug)}`).join("&")}`,
  };
}

const sailingsInput = z.object({ slug, from: day.optional(), to: day.optional() }).strict();

async function sailingAvailability(a: z.infer<typeof sailingsInput>, d: McpData) {
  const v = await d.vessel(a.slug);
  if (!v) return null;
  const its = new Map(v.itineraries.map((i) => [i.id, i]));
  const rows = (await d.sailings(v.id))
    .filter((s) => (!a.from || s.departsOn >= a.from) && (!a.to || s.departsOn <= a.to))
    .slice(0, 40);
  return {
    vessel: v.name,
    sailings: rows.map((s) => {
      const it = its.get(s.scheduleId);
      return {
        departs_on: s.departsOn,
        returns_on: s.returnsOn,
        route: it ? `${it.origin} to ${it.destination}` : null,
        booking: MODE_TEXT[s.mode] ?? MODE_TEXT.unconfirmed,
      };
    }),
    note: "No cabin counts or per-sailing prices are shared here; booking and exact prices are on Nilecruz after signing in.",
    url: vesselUrl(d.site, v.slug),
  };
}

type Tool = {
  name: string;
  title: string;
  description: string;
  input: z.ZodType;
  run: (args: never, d: McpData) => Promise<unknown>;
};

export const TOOLS: Tool[] = [
  {
    name: "search_cruises",
    title: "Search Nile cruises",
    description:
      "Find Nile cruise vessels on Nilecruz by route (origin and destination towns, e.g. Luxor, Aswan), departure dates, nights and vessel type. Returns each vessel's evaluation, public 'from' price and next departures, with a link.",
    input: searchInput,
    run: searchCruises as Tool["run"],
  },
  {
    name: "get_vessel",
    title: "A vessel's facts",
    description:
      "One vessel's facts, Nilecruz evaluation, cabin types, gratuity (paid on board) and itineraries by day, from its slug.",
    input: vesselInput,
    run: getVessel as Tool["run"],
  },
  {
    name: "compare_vessels",
    title: "Compare vessels",
    description: `Two to ${COMPARE_MAX} vessels side by side, from their slugs.`,
    input: compareInput,
    run: compareVessels as Tool["run"],
  },
  {
    name: "sailing_availability",
    title: "How a vessel's sailings book",
    description:
      "For each upcoming sailing of a vessel: instant confirmation, confirmed by the operator after asking, sold out, or to be confirmed. No prices or cabin counts.",
    input: sailingsInput,
    run: sailingAvailability as Tool["run"],
  },
];

/** The MCP tools/list entries, with JSON Schemas made from the same zod inputs that check the calls. */
export const toolList = () =>
  TOOLS.map((t) => ({
    name: t.name,
    title: t.title,
    description: t.description,
    inputSchema: z.toJSONSchema(t.input),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }));

/** Runs one tool call; problems come back as MCP tool errors the assistant can read and correct. */
export async function callTool(name: string, args: unknown, d: McpData) {
  const tool = TOOLS.find((t) => t.name === name);
  if (!tool) return toolError(`There is no tool "${name}". Nilecruz's assistant tools only read; booking happens on the site.`);
  const parsed = tool.input.safeParse(args ?? {});
  if (!parsed.success)
    return toolError(parsed.error.issues.map((i) => `${i.path.join(".") || "arguments"}: ${i.message}`).join("; "));
  const result = await tool.run(parsed.data as never, d);
  if (result === null) return toolError("No published vessel has that slug. Use search_cruises to find one.");
  return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result };
}

const toolError = (text: string) => ({ content: [{ type: "text", text }], isError: true });
