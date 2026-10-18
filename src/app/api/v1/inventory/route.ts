import { handleInventoryPost } from "@/server/connections/api";

/** The Nilecruz inventory API (DASH-OPR-026). See the format document in the operator dashboard. */
export const dynamic = "force-dynamic";

export function POST(request: Request) {
  return handleInventoryPost(request);
}

export function GET() {
  return Response.json(
    { error: { code: "method", message: "Send inventory with a signed POST. See the format document in your operator dashboard." } },
    { status: 405, headers: { Allow: "POST" } },
  );
}
