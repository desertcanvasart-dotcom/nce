# The live nilecruz.com: every address and where it goes

**Collected:** 21 Oct 2026, read-only (Batch 10-2, approved by Faris). Sources:
- the live sitemap (9 pages);
- the links on each public page;
- the address patterns the live pages build in the browser (read from its scripts).

The paths its `robots.txt` disallows (`/api/`, `/mcp`, `/dashboard`, `/account`, `/partners`) weren't crawled.

**Tested by:** `tests/e2e/http.spec.ts` ("every live-site address 301s to its new page"). **Rules in:** `src/lib/redirects.ts`.

| Live address | Found in | Goes to (301) |
|---|---|---|
| `/` | sitemap | `/` (same) |
| `/explore` | sitemap, links | `/cruises/` |
| `/explore?boat=dahabiya` | home page links | `/cruises/dahabiyas/` |
| `/explore?boat=powered` | home page links | `/cruises/motor-ships/` |
| `/explore?nights=3`, `?nights=4`, `?nights=7+` | home page links | `/cruises/` (no nights pages are built yet) |
| `/explore?route=lake` | home page links | `/cruises/` (the Lake Nasser page isn't built yet) |
| `/how-we-score` (and its `#…` sections) | sitemap, links | `/how-we-choose-vessels/` |
| `/independence` | sitemap, links | `/how-we-choose-vessels/` |
| `/match` | sitemap | `/plan-my-cruise/` |
| `/request` | sitemap | `/plan-my-cruise/` |
| `/tours` | sitemap, links | `/tours-extras/` |
| `/tours/{id}`, the 7 live tours | `docs/imports/nilecruz-tours.json` | each tour's new page (SEO-022) |
| `/tours/{any other id}` | the tour page pattern | `/tours-extras/` |
| `/cruise/{id}` | the vessel page pattern (`/cruise/${id}` in its scripts) | `/cruises/` |
| `/compare` | links | `/cruises/compare/` |
| `/account`, `/account?login=…` | links | `/dashboard/` (sign in first) |
| `/privacy`, `/terms` | sitemap, links | the same pages (with the trailing slash) |

**Two hops:** each address first gains its trailing slash (308, SEO-001), then 301s to its new page (`/explore` → `/explore/` → `/cruises/`). Search engines follow both.

**Gone (410):** none. Every live address has a sensible new home.

**Not possible to map one by one: vessel pages.**
- The live site answers every `/cruise/{id}` with a page, real ID or not.
- Its vessel IDs come from its `/api/`, which we didn't crawl.
- So all of them go to the listing for now.
- **To fix:** if the old site's vessel export (with its IDs) turns up, each can redirect to its own new page.
