import { describe, expect, it } from "vitest";
import type { ListingVessel } from "@/lib/marketplace/listing";
import type { VesselPage } from "@/lib/marketplace/vessel";
import { handleBody, handleMessage } from "@/lib/mcp/protocol";
import { callTool, toolList, type McpData } from "@/lib/mcp/tools";

const listed = (over: Partial<ListingVessel>): ListingVessel => ({
  id: "v1",
  slug: "sample-sun",
  name: "Sample Sun",
  type: "motor",
  category: null,
  maxGuests: 60,
  cabinCount: 30,
  deckCount: 4,
  sample: true,
  showcase: false,
  summary: null,
  evaluation: 82,
  itineraries: [{ origin: "Luxor", destination: "Aswan", nights: 4, departures: ["2026-11-02", "2026-11-09"] }],
  from: { amount: 95000, currency: "USD" },
  bookable: true,
  ...over,
});
const page: VesselPage = {
  id: "v1",
  slug: "sample-sun",
  name: "Sample Sun",
  type: "motor",
  category: null,
  maxGuests: 60,
  cabinCount: 30,
  deckCount: 4,
  mooring: null,
  sharedSpaces: [],
  yearBuilt: 2019,
  sample: true,
  showcase: false,
  summary: "A sample ship.",
  description: null,
  gratuityUsdMinor: 4000,
  photos: [],
  cabins: [
    {
      id: "c1",
      name: "Double",
      deck: "Main",
      sizeM2: 20,
      bed: "double",
      maxOccupancy: 2,
      view: "river",
      balcony: false,
      amenities: [],
    },
  ],
  itineraries: [
    {
      id: "s1",
      code: "LX4",
      origin: "Luxor",
      destination: "Aswan",
      nights: 4,
      sailingPeriod: null,
      sailsAt: null,
      days: [{ day: 1, title: "Luxor", body: "" }],
      departures: ["2026-11-02"],
    },
  ],
  evaluation: { score: 82, verdict: "recommended", assessedOn: "2026-09-01", evaluator: "x", dimensions: {} },
  externalRatings: [],
  from: { amount: 95000, currency: "USD" },
  bookable: true,
};
const data: McpData = {
  listing: async () => [
    listed({}),
    listed({
      id: "v2",
      slug: "sample-dahab",
      name: "Sample Dahab",
      type: "sail",
      bookable: false,
      from: undefined,
      itineraries: [{ origin: "Esna", destination: "Aswan", nights: 5, departures: [] }],
    }),
  ],
  vessel: async (s) => (s === "sample-sun" ? page : null),
  sailings: async () => [
    { scheduleId: "s1", departsOn: "2026-11-02", returnsOn: "2026-11-06", mode: "instant" },
    { scheduleId: "s1", departsOn: "2026-11-09", returnsOn: "2026-11-13", mode: "request" },
    { scheduleId: "s1", departsOn: "2026-11-16", returnsOn: "2026-11-20", mode: "sold_out" },
  ],
  site: "https://nilecruz.example",
};
const call = async (name: string, args: unknown) => {
  const r = (await callTool(name, args, data)) as { structuredContent?: unknown; isError?: boolean; content: { text: string }[] };
  return r;
};

describe("MCP protocol (DASH-PUB-011)", () => {
  it("initializes with tools only, in the version the assistant asked for when we know it", async () => {
    const r = await handleMessage(
      { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } },
      data,
    );
    expect(r).toMatchObject({
      id: 1,
      result: { protocolVersion: "2025-06-18", capabilities: { tools: {} }, serverInfo: { name: "nilecruz" } },
    });
    const other = await handleMessage(
      { jsonrpc: "2.0", id: 2, method: "initialize", params: { protocolVersion: "1999-01-01" } },
      data,
    );
    expect((other?.result as { protocolVersion: string }).protocolVersion).toBe("2025-11-25");
  });
  it("answers no notification, refuses what it doesn't know", async () => {
    expect(await handleMessage({ jsonrpc: "2.0", method: "notifications/initialized" }, data)).toBeNull();
    expect(await handleBody([{ jsonrpc: "2.0", method: "notifications/initialized" }], data)).toBeNull();
    expect(await handleMessage({ jsonrpc: "2.0", id: 3, method: "resources/list" }, data)).toMatchObject({
      error: { code: -32601 },
    });
    expect(await handleBody("nonsense", data)).toMatchObject({ error: { code: -32700 } });
  });
  it("lists four read-only tools with JSON Schemas", () => {
    const tools = toolList();
    expect(tools.map((t) => t.name)).toEqual(["search_cruises", "get_vessel", "compare_vessels", "sailing_availability"]);
    for (const t of tools) {
      expect(t.annotations.readOnlyHint).toBe(true);
      expect(t.inputSchema).toMatchObject({ type: "object" });
    }
  });
});

describe("MCP tools: what a visitor sees, nothing more (DASH-PUB-012)", () => {
  it("searches by route and nights, with the public from-price and a link", async () => {
    const r = (await call("search_cruises", { origin: "luxor", nights_min: 3 })).structuredContent as {
      count: number;
      vessels: { slug: string; from_price: unknown; url: string }[];
    };
    expect(r.count).toBe(1);
    expect(r.vessels[0]).toMatchObject({
      slug: "sample-sun",
      from_price: { amount: 950, currency: "USD" },
      url: "https://nilecruz.example/cruises/sample-sun/",
    });
  });
  it("shows no price for a vessel that isn't bookable", async () => {
    const r = (await call("search_cruises", { destination: "Aswan" })).structuredContent as {
      vessels: { slug: string; from_price: unknown }[];
    };
    expect(r.vessels.find((v) => v.slug === "sample-dahab")?.from_price).toBeNull();
  });
  it("gives sailings' booking modes without counts or prices", async () => {
    const r = await call("sailing_availability", { slug: "sample-sun" });
    expect(r.content[0]!.text).toContain("Instant confirmation");
    expect(r.content[0]!.text).toContain("Sold out");
    expect(r.content[0]!.text).not.toMatch(/places|left|price_minor|amount/i);
  });
  it("keeps the gratuity apart, paid on board (DATA-016)", async () => {
    const r = (await call("get_vessel", { slug: "sample-sun" })).structuredContent as { gratuity: unknown; evaluation: unknown };
    expect(r.gratuity).toEqual({ amount: 40, currency: "USD", note: "per person, paid on board at check-out" });
    expect(r.evaluation).toMatchObject({ score: 82, verdict: "Recommended" });
  });
  it("compares up to three and names those it can't find", async () => {
    const r = (await call("compare_vessels", { slugs: ["sample-sun", "nowhere"] })).structuredContent as {
      vessels: unknown[];
      not_found: string[];
      url: string;
    };
    expect(r.vessels).toHaveLength(1);
    expect(r.not_found).toEqual(["nowhere"]);
    expect(r.url).toBe("https://nilecruz.example/cruises/compare/?v=sample-sun");
    expect((await call("compare_vessels", { slugs: ["a", "b", "c", "d"] })).isError).toBe(true);
  });
  it("can't book, request or change anything, and explains bad arguments", async () => {
    for (const name of ["book_cruise", "create_request", "reserve"]) {
      const r = await call(name, {});
      expect(r.isError).toBe(true);
      expect(r.content[0]!.text).toContain("only read");
    }
    expect((await call("search_cruises", { from: "next week" })).content[0]!.text).toContain("yyyy-mm-dd");
    expect((await call("get_vessel", { slug: "sample-sun", admin: true })).isError).toBe(true);
  });
});
