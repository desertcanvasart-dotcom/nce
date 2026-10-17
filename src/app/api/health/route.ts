// Health check for Railway (railway.json healthcheckPath). No data, no secrets.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ ok: true });
}
