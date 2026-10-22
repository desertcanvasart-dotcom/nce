import "server-only";
import { siteUrl } from "@/lib/env";
import { handleBody } from "@/lib/mcp/protocol";
import type { McpData } from "@/lib/mcp/tools";
import { publicListing, publicSailingModes, publicVessel } from "@/server/marketplace/queries";
import { rateLimit } from "@/server/security/rate-limit";

/**
 * DASH-PUB-011, 012 (ADR-101): the MCP endpoint. No login: it reads the same cached public data an anonymous visitor's
 * pages read, so it can show nothing a visitor can't. Limited per address like the public forms.
 */
const MAX_BODY = 64 * 1024;

const data: McpData = {
  listing: publicListing,
  vessel: publicVessel,
  sailings: publicSailingModes,
  site: siteUrl,
};

const rpcError = (code: number, message: string, status: number, headers: Record<string, string> = {}) =>
  Response.json({ jsonrpc: "2.0", id: null, error: { code, message } }, { status, headers });

export async function handleMcpPost(request: Request): Promise<Response> {
  const limit = await rateLimit("mcp");
  if (!limit.ok)
    return rpcError(-32000, "Too many requests. Try again shortly.", 429, { "Retry-After": String(limit.retryAfter) });
  // SEC-011: refuse by the declared size before reading, and count bytes, not characters.
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY) return rpcError(-32600, "Request too large", 413);
  const text = await request.text();
  if (Buffer.byteLength(text) > MAX_BODY) return rpcError(-32600, "Request too large", 413);
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return rpcError(-32700, "Parse error", 400);
  }
  try {
    const reply = await handleBody(body, data);
    return reply === null
      ? new Response(null, { status: 202 })
      : Response.json(reply, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return rpcError(-32603, "Nilecruz couldn't read its catalogue just now. Try again in a moment.", 500);
  }
}
