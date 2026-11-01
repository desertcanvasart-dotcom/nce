import { createServerClient } from "@supabase/ssr";
import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { sessionCookieOptions } from "./lib/auth/cookies";
import { siteUrl } from "./lib/env";
import { liveSiteRedirect } from "./lib/redirects";
import { tourPublished } from "./server/content/tour-published";

const intl = createMiddleware(routing);

const site = new URL(siteUrl);
// Paths the proxy sees only on the www host (the second matcher): API routes, Next internals and files.
const NOT_A_PAGE = /^\/(api|_next|_vercel|dev-parity)(\/|$)|\.[^/]*$/;

/**
 * www to the bare domain, and a live nilecruz.com address to its new page (SEO-021), in one hop together. Next adds a
 * missing trailing slash before this runs (SEO-001); turning that off would also drop the slash from every `<Link>`.
 */
async function redirectFor(request: NextRequest): Promise<NextResponse | null> {
  const { pathname, search, searchParams } = request.nextUrl;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  const www = host === `www.${site.host}`;
  if (NOT_A_PAGE.test(pathname)) return www ? NextResponse.redirect(new URL(pathname + search, site), 301) : null;

  let target: string | null = null;
  let status = 301;
  const live = liveSiteRedirect(pathname, searchParams);
  if (live) {
    // The old query only picked the rule; the new pages don't read it. A tour that isn't published yet goes to the
    // tours page for now (302, so nothing remembers it).
    const unpublished = live.tour ? !(await tourPublished(live.tour)) : false;
    target = unpublished ? "/tours-extras/" : live.destination;
    status = unpublished ? 302 : 301;
  } else if (www) target = pathname + search;
  if (!target) return null;
  return NextResponse.redirect(new URL(target, www ? site : request.nextUrl), status);
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
  // Everything except API routes, Next internals, the dev-only parity frame and files with an extension; on the www
  // host, everything (it all redirects to the bare domain).
  matcher: ["/((?!api|_next|_vercel|dev-parity|.*\\..*).*)", { source: "/:path*", has: [{ type: "host", value: "www\\..+" }] }],
};
