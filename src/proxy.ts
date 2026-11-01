import { createServerClient } from "@supabase/ssr";
import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { sessionCookieOptions } from "./lib/auth/cookies";
import { liveSiteRedirect } from "./lib/redirects";
import { tourPublished } from "./server/content/tour-published";

const intl = createMiddleware(routing);

/**
 * A live nilecruz.com address to its new page (SEO-021). Next adds a missing trailing slash before this runs (SEO-001);
 * turning that off would also drop the slash from every `<Link>`. www is redirected in next.config.ts: Next shortens
 * a proxy redirect to the server's own address into a bare path, which would keep the visitor on www.
 */
async function redirectFor(request: NextRequest): Promise<NextResponse | null> {
  const live = liveSiteRedirect(request.nextUrl.pathname, request.nextUrl.searchParams);
  if (!live) return null;
  // The old query only picked the rule; the new pages don't read it. A tour that isn't published yet goes to the
  // tours page for now (302, so nothing remembers it).
  const unpublished = live.tour ? !(await tourPublished(live.tour)) : false;
  return NextResponse.redirect(
    new URL(unpublished ? "/tours-extras/" : live.destination, request.nextUrl),
    unpublished ? 302 : 301,
  );
}

/**
 * Redirects, then language routing, then (only for visitors who have a session cookie) a session refresh, so a signed-in
 * person's short-lived access token is renewed before pages read it (SEC-005). Anonymous visitors cost nothing extra.
 */
export default async function proxy(request: NextRequest) {
  const redirect = await redirectFor(request);
  if (redirect) return redirect;

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
