/**
 * Editorial pages (Batch 6, ADR-096). The source of truth is Sanity (`article` with `pageId`); the same drafts live in
 * src/content/pages/ so builds without Sanity (CI) still render, and scripts/seed-content.ts loads them into Sanity.
 */
export type EditorialSection = { heading: string; paragraphs: string[] };

export type EditorialPage = {
  /** The silo workbook row, e.g. "P027". */
  id: string;
  /** The page's H1, as in the workbook. */
  title: string;
  /** The intro. "[[up]]" marks where the one link up to the parent goes (SEO-008). */
  standfirst: string;
  /** A close variant of the parent's keyword, when the keyword itself reads badly in the sentence (SEO-014). */
  upAnchor?: string;
  sections: EditorialSection[];
  faqs: { q: string; a: string }[];
  seoTitle?: string;
  seoDescription?: string;
  /** Figures or text are placeholders: the page shows "Sample data". */
  sample: boolean;
  /** "draft" until Faris's team approves the copy: the page shows "Draft for review". */
  review: "draft" | "approved";
};

/** Splits the standfirst at the [[up]] marker; without one, the link goes at the end. */
export function splitUp(standfirst: string): [string, string] {
  const i = standfirst.indexOf("[[up]]");
  return i < 0 ? [standfirst, ""] : [standfirst.slice(0, i), standfirst.slice(i + "[[up]]".length)];
}

/** House style (BRAND-001, 002): no "best", no superlatives like "unbeatable", no exclamation marks or emoji. */
const BANNED = [/\bbest\b(?!\s+for\b)/i, /\bunbeatable\b/i, /once in a lifetime/i, /[!！]/, /\p{Extended_Pictographic}/u];
export function houseStyleProblems(page: EditorialPage): string[] {
  const texts = [
    page.title,
    page.standfirst,
    ...page.sections.flatMap((s) => [s.heading, ...s.paragraphs]),
    ...page.faqs.flatMap((f) => [f.q, f.a]),
  ];
  return texts.filter((t) => BANNED.some((re) => re.test(t)));
}

// ── Sanity's portable text ──────────────────────────────────────────────────────────────────────────────
export type Block = { _type: string; style?: string; children?: { text?: string }[] };

export const blockText = (b: Block) => (b.children ?? []).map((c) => c.text ?? "").join("");

/** Portable text → sections: each h2 starts one, normal blocks are its paragraphs. */
export function toSections(body: Block[] = []): EditorialPage["sections"] {
  const out: EditorialPage["sections"] = [];
  for (const b of body) {
    if (b._type !== "block") continue;
    if (b.style === "h2") out.push({ heading: blockText(b), paragraphs: [] });
    else if (blockText(b).trim()) {
      if (!out.length) out.push({ heading: "", paragraphs: [] });
      out.at(-1)!.paragraphs.push(blockText(b));
    }
  }
  return out;
}
