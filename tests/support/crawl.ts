/**
 * Batch 10 (SEO-003, 005, 017, 018, I18N-003): a small crawler over the public site. It starts at a language's home
 * page, follows internal links breadth-first and records, per page: clicks from home, H1 count, JSON-LD types and the
 * internal links it found (the language switch's links, marked with hreflang, are kept apart).
 */
export type CrawledPage = {
  path: string;
  depth: number;
  status: number;
  h1: number;
  types: string[];
  jsonValid: boolean;
  /** The structured data states a price (an Offer is only required then). */
  priced: boolean;
  links: string[];
};

const SKIP = /^\/(?:(?:es|ja)\/)?(?:dashboard|account|api|dev|operator-reply|mcp|studio)\b|\/reserve\/|\/cruises\/compare\//;

/** The JSON-LD types on a page, including those inside @graph and nested objects. */
export function jsonLdTypes(html: string): { types: string[]; valid: boolean; priced: boolean } {
  const types = new Set<string>();
  let valid = true;
  let priced = false;
  const walk = (v: unknown) => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") {
      const t = (v as Record<string, unknown>)["@type"];
      if ("price" in v) priced = true;
      if (typeof t === "string") types.add(t);
      else if (Array.isArray(t)) t.forEach((x) => typeof x === "string" && types.add(x));
      Object.values(v).forEach(walk);
    }
  };
  for (const m of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    try {
      walk(JSON.parse(m[1]!));
    } catch {
      valid = false;
    }
  }
  return { types: [...types].sort(), valid, priced };
}

/** Internal links on a page (path only, trailing slash kept), leaving out the language switch's links. */
export function internalLinks(html: string): string[] {
  const out = new Set<string>();
  for (const m of html.matchAll(/<a\b([^>]*)>/g)) {
    const attrs = m[1]!;
    if (/\bhrefLang=/i.test(attrs)) continue;
    const href = /\bhref="([^"]*)"/.exec(attrs)?.[1];
    if (!href || !href.startsWith("/") || href.startsWith("//")) continue;
    out.add(href.replace(/[?#].*$/, "").replace(/&amp;/g, "&"));
  }
  return [...out];
}

export async function crawl(
  get: (path: string) => Promise<{ status: number; html: string }>,
  start = "/",
  limit = 600,
): Promise<Map<string, CrawledPage>> {
  const seen = new Map<string, CrawledPage>();
  const queue: [string, number][] = [[start, 0]];
  const queued = new Set([start]);
  while (queue.length && seen.size < limit) {
    const [path, depth] = queue.shift()!;
    const { status, html } = await get(path);
    const { types, valid, priced } = jsonLdTypes(html);
    const links = status === 200 ? internalLinks(html) : [];
    seen.set(path, { path, depth, status, h1: (html.match(/<h1[\s>]/g) ?? []).length, types, jsonValid: valid, priced, links });
    for (const l of links) {
      if (queued.has(l) || SKIP.test(l) || !l.endsWith("/")) continue;
      queued.add(l);
      queue.push([l, depth + 1]);
    }
  }
  return seen;
}
