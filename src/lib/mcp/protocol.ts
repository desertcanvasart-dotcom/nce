/**
 * DASH-PUB-011 (ADR-101): a minimal MCP server over Streamable HTTP, stateless: each POST carries one JSON-RPC message
 * (or a batch) and gets JSON back; no sessions, no server-sent events, no resources or prompts. Free of I/O.
 */
import { callTool, toolList, type McpData } from "./tools";

export const PROTOCOL_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26"] as const;

type Message = { jsonrpc?: unknown; id?: unknown; method?: unknown; params?: unknown };
type Reply = { jsonrpc: "2.0"; id: string | number | null; result?: unknown; error?: { code: number; message: string } };

const ok = (id: Reply["id"], result: unknown): Reply => ({ jsonrpc: "2.0", id, result });
const fail = (id: Reply["id"], code: number, message: string): Reply => ({ jsonrpc: "2.0", id, error: { code, message } });

const INSTRUCTIONS =
  "Nilecruz is a marketplace and booking agent for Nile cruises. These tools only read public information: vessels, " +
  "Nilecruz's own evaluations, itineraries, the public 'from' price and how each sailing books. They cannot book, " +
  "send requests or change anything. Always give the traveller the link in each answer; booking, exact prices and " +
  "requests for offers happen on nilecruz.com after signing in.";

/** One message's reply, or null for a notification (no id), which gets none. */
export async function handleMessage(m: Message, d: McpData): Promise<Reply | null> {
  const id = typeof m.id === "string" || typeof m.id === "number" ? m.id : null;
  if (m.jsonrpc !== "2.0" || typeof m.method !== "string") return fail(id, -32600, "Invalid request");
  const notification = m.id === undefined;
  const params = (m.params && typeof m.params === "object" ? m.params : {}) as Record<string, unknown>;
  if (notification) return null; // notifications/initialized, notifications/cancelled: nothing to answer

  switch (m.method) {
    case "initialize": {
      const asked = String(params.protocolVersion ?? "");
      const version = (PROTOCOL_VERSIONS as readonly string[]).includes(asked) ? asked : PROTOCOL_VERSIONS[0];
      return ok(id, {
        protocolVersion: version,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "nilecruz", title: "Nilecruz Nile cruises", version: "1.0.0", websiteUrl: d.site },
        instructions: INSTRUCTIONS,
      });
    }
    case "ping":
      return ok(id, {});
    case "tools/list":
      return ok(id, { tools: toolList() });
    case "tools/call": {
      if (typeof params.name !== "string") return fail(id, -32602, "tools/call needs a tool name");
      return ok(id, await callTool(params.name, params.arguments, d));
    }
    default:
      return fail(id, -32601, `Method not found: ${m.method}`);
  }
}

/** A POST body: one message or a batch. Returns the JSON to send, or null when nothing needs answering (202). */
export async function handleBody(body: unknown, d: McpData): Promise<unknown> {
  if (Array.isArray(body)) {
    if (!body.length) return fail(null, -32600, "Invalid request");
    const replies = (await Promise.all(body.map((m) => handleMessage((m ?? {}) as Message, d)))).filter(Boolean);
    return replies.length ? replies : null;
  }
  if (!body || typeof body !== "object") return fail(null, -32700, "Parse error");
  return handleMessage(body as Message, d);
}
