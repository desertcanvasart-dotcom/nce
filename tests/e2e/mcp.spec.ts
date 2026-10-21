import { expect, test, type APIRequestContext } from "@playwright/test";

/** DASH-PUB-011, 012 (ADR-101): assistants read public cruise data through MCP; nothing can be booked or changed. */
let n = 0;
async function rpc(request: APIRequestContext, method: string, params: unknown = {}) {
  const r = await request.post("/api/mcp/", {
    data: { jsonrpc: "2.0", id: ++n, method, params },
    headers: { Accept: "application/json, text/event-stream" },
  });
  expect(r.status()).toBe(200);
  return (await r.json()) as { result?: Record<string, unknown>; error?: { code: number } };
}

test("an assistant connects, lists the read-only tools and searches cruises", async ({ request }) => {
  const init = await rpc(request, "initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "e2e", version: "1" },
  });
  expect(init.result).toMatchObject({ protocolVersion: "2025-06-18", serverInfo: { name: "nilecruz" } });
  const note = await request.post("/api/mcp/", { data: { jsonrpc: "2.0", method: "notifications/initialized" } });
  expect(note.status()).toBe(202);

  const list = await rpc(request, "tools/list");
  const tools = (list.result!.tools as { name: string; annotations: { readOnlyHint: boolean } }[]).map((t) => t.name);
  expect(tools).toEqual(["search_cruises", "get_vessel", "compare_vessels", "sailing_availability"]);

  const found = await rpc(request, "tools/call", { name: "search_cruises", arguments: {} });
  const result = found.result!.structuredContent as { count: number; vessels: { slug: string; url: string }[] };
  expect(result.count).toBeGreaterThan(0);
  expect(result.vessels[0]!.url).toMatch(/\/cruises\/[a-z0-9-]+\/$/);
  // A visitor's view: no per-sailing prices or cabin counts anywhere in the answer.
  expect(JSON.stringify(found.result)).not.toMatch(/places_left|placesLeft|available":\s*\d|price_minor/);

  const slug = result.vessels[0]!.slug;
  const sailings = await rpc(request, "tools/call", { name: "sailing_availability", arguments: { slug } });
  expect(sailings.result!.isError).toBeUndefined();
  expect(JSON.stringify(sailings.result)).not.toMatch(/places|price_minor|amount/);
});

test("booking through MCP is refused, and only POST is accepted", async ({ request }) => {
  const r = await rpc(request, "tools/call", { name: "reserve_cabin", arguments: { slug: "any" } });
  expect(r.result).toMatchObject({ isError: true });
  expect(JSON.stringify(r.result)).toContain("only read");
  expect((await request.get("/api/mcp/")).status()).toBe(405);
  const bad = await request.post("/api/mcp/", { data: "not json", headers: { "Content-Type": "application/json" } });
  expect(bad.status()).toBe(400);
});
