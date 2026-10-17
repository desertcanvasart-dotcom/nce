import { NextResponse } from "next/server";
import { routing, type Locale } from "@/i18n/routing";
import { localizedPath } from "@/lib/seo/metadata";
import { isSameOrigin } from "@/server/auth";
import { getDb } from "@/server/db";

/**
 * SEC-005: sign-out is a POST from this site only. It ends the session on the server (the refresh token is
 * revoked), not just in the browser, then sends the person to the home page.
 */
export async function POST(request: Request, { params }: { params: Promise<{ locale: string }> }) {
  if (!isSameOrigin(request)) return new NextResponse("Forbidden", { status: 403 });
  const { locale } = await params;
  const l: Locale = (routing.locales as readonly string[]).includes(locale) ? (locale as Locale) : "en";
  const db = await getDb();
  await db.auth.signOut({ scope: "local" });
  return NextResponse.redirect(new URL(localizedPath(l, "/"), request.url), { status: 303 });
}

export function GET() {
  return new NextResponse("Method Not Allowed", { status: 405, headers: { Allow: "POST" } });
}
