/**
 * After a data import, expire the site's cached catalogue and editorial pages (PERF-010) through the signed refresh
 * route, so the change shows on the next visit instead of after up to two ten-minute cache cycles (the page, then the
 * listing it reads). The data is already written when this runs, so a refresh that can't be made only warns.
 *
 * Per target: <TARGET>_SITE_URL (production defaults to https://nilecruz.com) and <TARGET>_FEED_PULL_SECRET, the
 * same value as FEED_PULL_SECRET in that environment's Railway service. Local runs need no refresh.
 */
import { refreshSignature } from "../../src/lib/connections/signature";

const DEFAULT_SITE: Record<string, string> = { production: "https://nilecruz.com" };

export async function refreshSite(target: string): Promise<boolean> {
  if (target === "local") return true;
  const env = target.toUpperCase();
  const site = process.env[`${env}_SITE_URL`] ?? DEFAULT_SITE[target];
  const secret = process.env[`${env}_FEED_PULL_SECRET`];
  if (!site || !secret) {
    console.warn(
      `\nNot refreshed: set ${env}_SITE_URL and ${env}_FEED_PULL_SECRET, then run pnpm refresh:site --target=${target}.` +
        "\nUntil then the site may show the old data for up to about 20 minutes.",
    );
    return false;
  }
  const ts = String(Math.floor(Date.now() / 1000));
  try {
    const res = await fetch(new URL("/api/internal/catalogue/refresh/", site), {
      method: "POST",
      headers: { "nilecruz-timestamp": ts, "nilecruz-signature": refreshSignature(secret, ts) },
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    console.log(`Refreshed ${site}: the next visit shows the change.`);
    return true;
  } catch (e) {
    console.warn(`\nNot refreshed (${e instanceof Error ? e.message : e}). Run pnpm refresh:site --target=${target}.`);
    return false;
  }
}
