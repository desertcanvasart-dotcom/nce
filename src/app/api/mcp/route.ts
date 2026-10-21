import { handleMcpPost } from "@/server/mcp/server";

/** Read-only MCP for assistants (DASH-PUB-011, 012, ADR-101): public Nile cruise data, no login, no booking. */
export const dynamic = "force-dynamic";

export function POST(request: Request) {
  return handleMcpPost(request);
}

// Stateless: no server-sent event stream to open and no session to end.
const notAllowed = () =>
  Response.json({ error: "Send MCP JSON-RPC messages with POST to this address." }, { status: 405, headers: { Allow: "POST" } });
export const GET = notAllowed;
export const DELETE = notAllowed;
