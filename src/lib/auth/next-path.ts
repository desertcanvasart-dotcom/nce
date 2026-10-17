/**
 * Where to go after signing in (`?next=`). Only paths on this site are accepted, so a crafted link
 * can never send someone to another website after they type their password (no open redirects).
 */
export function safeNextPath(raw: string | null | undefined, fallback = "/dashboard/"): string {
  if (!raw) return fallback;
  let v: string;
  try {
    v = decodeURIComponent(raw).trim();
  } catch {
    return fallback;
  }
  if (!v.startsWith("/") || v.startsWith("//") || v.includes("\\") || /[\u0000-\u001f]/.test(v)) return fallback;
  try {
    const u = new URL(v, "http://n.invalid");
    if (u.origin !== "http://n.invalid") return fallback;
    if (u.pathname.startsWith("/account/") || /^\/(es|ja)\/account\//.test(u.pathname)) return fallback;
    return u.pathname + u.search + u.hash;
  } catch {
    return fallback;
  }
}
