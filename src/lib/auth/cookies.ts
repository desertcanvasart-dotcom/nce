/**
 * SEC-005: session cookies are httpOnly (scripts in the page can't read them), SameSite=Lax, and Secure
 * on https. We never use Supabase from the browser, so nothing client-side needs to read them.
 */
export function sessionCookieOptions(siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "") {
  return {
    path: "/",
    sameSite: "lax" as const,
    httpOnly: true,
    secure: siteUrl.trim().startsWith("https://"),
  };
}
