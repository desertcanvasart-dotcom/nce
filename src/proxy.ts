import { createServerClient } from "@supabase/ssr";
import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { sessionCookieOptions } from "./lib/auth/cookies";

const intl = createMiddleware(routing);

/**
 * Language routing, then (only for visitors who have a session cookie) a session refresh, so a signed-in
 * person's short-lived access token is renewed before pages read it (SEC-005). Anonymous visitors cost nothing extra.
 */
export default async function proxy(request: NextRequest) {
  // Dashboards are English only (DASH-BND-006): /es/dashboard/… and /ja/dashboard/… go to /dashboard/….
  const lang = /^\/(es|ja)(\/dashboard(?:\/.*)?)$/.exec(request.nextUrl.pathname);
  if (lang) {
    const url = request.nextUrl.clone();
    url.pathname = lang[2]!;
    return NextResponse.redirect(url, 308);
  }

  const response = intl(request);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const hasSession = request.cookies.getAll().some((c) => c.name.startsWith("sb-"));
  if (!url || !key || !hasSession) return response;

  const supabase = createServerClient(url, key, {
    cookieOptions: sessionCookieOptions(),
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });
  await supabase.auth.getClaims();
  return response;
}

export const config = {
  // Everything except API routes, Next internals, the dev-only parity frame and files with an extension.
  matcher: "/((?!api|_next|_vercel|dev-parity|.*\\..*).*)",
};
