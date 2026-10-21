# Batch 10 brief: SEO and languages

**Status:** draft for Faris · **Branch:** `batch-10-1-…`, `batch-10-2-…` · **Size:** M (two pull requests)

**Goal:** search engines find every built page once, in the right language, with valid structured data. Visitors arriving on old nilecruz.com links land on the right new page.

**Exit criterion (BATCH-PLAN):**
- the crawl finds no orphan pages, depth is 3 or less, and schema is valid;
- redirects are tested.

## Where we are

| Area | Today |
|---|---|
| Languages | English unprefixed, Spanish under `/es/`, Japanese under `/ja/` (I18N-001). Interface text is translated. Page content falls back to English where no translation exists, which is most pages. |
| hreflang | None. Each page has only its own canonical. |
| Sitemaps | None. `robots.txt` exists and blocks private areas, staging and previews. |
| Structured data | Builders exist for articles, FAQs, the organisation, tours, destinations and cruises, but nothing checks them against each page's silo row. |
| Links | The link test checks each built page's links against the workbook (SEO-008–014). No depth or orphan check yet. |
| Old-site redirects | Wired for the main pages and the live tour pages (SEO-021, SEO-022), but not yet checked against the live site's full URL list. |
| Spanish slugs | Spanish pages use English slugs. |

## What I recommend building

### 10-1: the plumbing search engines read

| ID | What |
|---|---|
| **The translated-page rule** (new; see question 1) | A page counts as available in Spanish or Japanese only when its main content is translated. Until then, the `/es/` or `/ja/` copy is `noindex`, left out of hreflang and the sitemaps, and shows a short "This page isn't in Spanish yet" note. English pages are unaffected. |
| **SEO-007** hreflang | Each page lists its translated versions (en, es, ja) and x-default (English), both ways, generated from one list. |
| **I18N-004** language switch | The switch goes to the same page in the other language, or to that language's home page with a note when the page isn't translated. |
| **I18N-003** links stay in the language | Internal links keep the current language prefix. A test checks every built page in each language. |
| **SEO-019** sitemaps | One XML sitemap per language, plus an index listing only indexable URLs: no `noindex` pages, sample data, dashboard or private pages. Published vessels and tours are included. |
| **SEO-003** one H1 | A CI check: every public page has exactly one H1. |
| **SEO-005** schema by silo row | A CI check: each page outputs the schema types its silo row lists, and each block passes structural validation (required fields, valid JSON). |
| **SEO-017, SEO-018** crawl | A CI crawler starts at the home page, follows internal links in each language and fails on any of these: a built page it can't reach (orphan), a page more than 3 clicks deep, or a URL more than 3 folders deep. |
| **DASH-BND-006** | Checked: every public page renders in all three languages. Admin and operator screens stay in English. |

### 10-2: Spanish slugs and the old site's addresses

| ID | What |
|---|---|
| **I18N-002** Spanish slugs | Spanish pages get Spanish slugs (`/es/cruceros/…`), with the English-slug Spanish URLs redirecting to them. Japanese keeps English slugs (ADR-022). Slugs come from a validated keyword list (see question 2). |
| **I18N-012** keyword validation | A Spanish and a Japanese keyword list for the Phase 1 pages: the main search term, the slug (Spanish only) and the title. Reviewed before any page is translated. |
| **I18N-005** translation order | The order is plumbed in: pillar and hub pages first, then money pages, then supporting articles. The translated-page rule makes each page go live as its translation arrives, with nothing else to switch on. |
| **SEO-021** redirects tested | I list every URL on the live nilecruz.com (its sitemap plus a crawl). Each one gets a 301 to its new page, or is marked "gone" (410) if it has no equivalent. An end-to-end test follows every redirect. |

**Not in Batch 10:** writing the Spanish and Japanese page content. That is translators' work, and it arrives page by page.

## Tests

- **Unit:** hreflang sets (reciprocal, x-default); the translated-page rule; sitemap filtering; Spanish slug mapping both ways.
- **End-to-end:**
  - the crawler (orphans, depth, one H1, schema types per silo row);
  - the language switch on translated and untranslated pages;
  - links stay in the language;
  - every old-site redirect.
- **Screenshots:** the "not translated yet" note and the language switch, at 375, 768 and 1440, in Day and Night.

## Questions for Faris

1. **Pages not yet translated.** What should `/es/…` and `/ja/…` show before a page's translation arrives?
   - **Recommended:** keep showing English with a short note, set to `noindex`, and leave them out of hreflang and the sitemaps. Google then sees only real translations, with no duplicate content.
   - The alternative is to redirect to the English page until it's translated.
2. **Spanish and Japanese keywords.** Who validates them?
   - **Recommended:** I draft the lists (search term, Spanish slug, title per page), and the native speakers who reviewed the cancellation wording check them.
   - If you have an SEO tool account (Ahrefs or Semrush), you could export search volumes for me to use.
3. **The old site's URLs.** May I read nilecruz.com's sitemap and crawl its public pages (read-only) to build the full redirect list? **Recommended: yes.** You'd then confirm any page I mark "gone".
4. **Order.** **Recommended:** 10-1 first; 10-2 once the keyword lists are reviewed.
