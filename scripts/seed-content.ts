/**
 * ADR-096: load the drafted education pages (src/content/pages/) into Sanity as `article` documents, marked
 * "Draft for review". Dry run by default.
 *
 *   pnpm seed:content                                   what would be written
 *   pnpm seed:content --apply                           into the development dataset
 *   pnpm seed:content --apply --dataset=production      into production, only after Faris approves the copy
 *
 * Existing pages are left alone unless --replace is given, so editors' changes in Sanity are never overwritten.
 */
import { randomUUID } from "node:crypto";
import { createClient } from "@sanity/client";
import { DRAFT_PAGES } from "../src/content/pages";
import { LINK_MAP } from "../src/lib/seo/links";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const replace = args.includes("--replace");
const dataset = args.find((a) => a.startsWith("--dataset="))?.split("=")[1] ?? "development";
if (!["development", "production"].includes(dataset)) throw new Error("--dataset is development or production");

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const token = process.env.SANITY_API_WRITE_TOKEN;
if (!projectId || (apply && !token))
  throw new Error("Set NEXT_PUBLIC_SANITY_PROJECT_ID and SANITY_API_WRITE_TOKEN (in .env.local).");
const client = createClient({ projectId, dataset, token, apiVersion: "2026-10-01", useCdn: false });

const key = () => randomUUID().replace(/-/g, "").slice(0, 12);
const block = (text: string, style: "normal" | "h2" = "normal") => ({
  _type: "block",
  _key: key(),
  style,
  markDefs: [],
  children: [{ _type: "span", _key: key(), text, marks: [] }],
});

const urlOf = Object.fromEntries(Object.entries(LINK_MAP).map(([url, p]) => [p.id, url]));

async function main() {
  const existing = new Set(await client.fetch<string[]>(`*[_type == "article" && language == "en"].pageId`));
  for (const page of Object.values(DRAFT_PAGES)) {
    const url = urlOf[page.id];
    const slug = url === "/" ? "home" : url!.split("/").filter(Boolean).join("-");
    if (existing.has(page.id) && !replace) {
      console.log(`  keep    ${page.id} ${url} (already in Sanity)`);
      continue;
    }
    const doc = {
      _id: `page-${page.id.toLowerCase()}-en`,
      _type: "article",
      language: "en",
      pageId: page.id,
      reviewStatus: page.review,
      title: page.title,
      slug: { _type: "slug", current: slug },
      standfirst: page.standfirst,
      ...(page.upAnchor ? { upAnchor: page.upAnchor } : {}),
      body: page.sections.flatMap((s) => [...(s.heading ? [block(s.heading, "h2")] : []), ...s.paragraphs.map((p) => block(p))]),
      faqs: page.faqs.map((f) => ({ _type: "pageFaq", _key: key(), question: f.q, answer: [block(f.a)] })),
      seoTitle: page.seoTitle,
      seoDescription: page.seoDescription,
      sample: page.sample,
    };
    console.log(`  ${apply ? "write" : "would write"} ${page.id} ${url} → ${dataset}`);
    if (apply) await client.createOrReplace(doc);
  }
  console.log(apply ? "Done." : "Dry run only. Add --apply to write.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
