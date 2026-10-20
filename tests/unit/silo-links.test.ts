import { describe, expect, it } from "vitest";
import { DRAFT_PAGES } from "@/content/pages";
import { profileWithStats } from "@/content/vessel-types";
import { houseStyleProblems, splitUp, toSections } from "@/lib/content/editorial";
import { applySearch, parseSearch, type ListingVessel } from "@/lib/marketplace/listing";
import { faqJsonLd, websiteJsonLd } from "@/lib/seo/jsonld";
import {
  BUILT,
  bridges,
  children,
  closingListing,
  expectedLinks,
  keywordText,
  LINK_MAP,
  sentence,
  siblings,
  trail,
  up,
} from "@/lib/seo/links";

describe("the link map from the workbook (SEO-008–011)", () => {
  it("holds every row except the felucca ones (ADR-008)", () => {
    expect(Object.keys(LINK_MAP).length).toBeGreaterThan(90);
    expect(Object.keys(LINK_MAP).some((u) => u.includes("felucca"))).toBe(false);
    expect(
      Object.values(LINK_MAP)
        .flatMap((p) => [...p.down, ...p.across, ...p.bridges])
        .some((u) => u.includes("felucca")),
    ).toBe(false);
    expect(LINK_MAP["/vessels/dahabiya/"]).toMatchObject({ id: "P027", parent: "/vessels/", keyword: "dahabiya", phase: 1 });
  });

  it("lists only pages that exist, every one of them in the workbook", () => {
    for (const u of BUILT) expect(LINK_MAP[u], u).toBeDefined();
  });

  it("builds the breadcrumb from the parents, pillars by their navigation names", () => {
    expect(trail("/vessels/dahabiya/a-day-on-board/")).toEqual([
      { name: "Home", path: "/" },
      { name: "Vessels", path: "/vessels/" },
      { name: "Dahabiya", path: "/vessels/dahabiya/" },
      { name: "Dahabiya experience", path: "/vessels/dahabiya/a-day-on-board/" },
    ]);
  });

  it("links up once with the parent's keyword, never from a pillar to home", () => {
    expect(up("/vessels/dahabiya/")).toEqual({ href: "/vessels/", anchor: "Nile cruise boat types" });
    expect(up("/vessels/")).toBeNull();
  });

  it("links down, across and out only to built pages, at most three siblings", () => {
    expect(children("/vessels/").map((l) => l.href)).toEqual([
      "/vessels/dahabiya/",
      "/vessels/motor-cruise-ships/",
      "/vessels/paddle-steamers/",
      "/vessels/compare/",
    ]);
    expect(siblings("/vessels/dahabiya/a-day-on-board/")).toEqual([]); // its siblings are Phase 2 and 3
    expect(siblings("/vessels/compare/").length).toBeLessThanOrEqual(3);
    expect(bridges("/vessels/").map((l) => l.href)).toEqual(["/cruises/"]); // /nile-cruise-prices/ isn't built yet
  });

  it("ends each page with its matching listing, or all cruises when that facet isn't built", () => {
    expect(closingListing("/vessels/dahabiya/")).toEqual({ href: "/cruises/dahabiyas/", anchor: "Dahabiya cruise" });
    expect(closingListing("/vessels/paddle-steamers/").href).toBe("/cruises/");
    expect(expectedLinks("/vessels/motor-cruise-ships/")).toEqual(
      expect.arrayContaining(["/vessels/", "/vessels/motor-cruise-ships/a-day-on-board/", "/cruises/motor-ships/"]),
    );
  });

  it("anchors use the keyword with place names capitalised (SEO-014)", () => {
    expect(keywordText("nile cruise ship experience")).toBe("Nile cruise ship experience");
    expect(sentence("luxor to aswan cruise")).toBe("Luxor to Aswan cruise");
  });
});

describe("the drafted pages (ADR-096)", () => {
  const urlOf = Object.fromEntries(Object.entries(LINK_MAP).map(([u, p]) => [p.id, u]));
  for (const page of Object.values(DRAFT_PAGES)) {
    it(`${page.id} matches its workbook row and the house style`, () => {
      const url = urlOf[page.id]!;
      expect(BUILT.has(url), url).toBe(true);
      expect(page.title).toBe(LINK_MAP[url]!.h1);
      expect(houseStyleProblems(page)).toEqual([]);
      expect(page.review).toBe("draft");
      if (up(url)) expect(page.standfirst).toContain("[[up]]");
      expect(page.faqs.length).toBeGreaterThan(0);
    });
  }

  it("splits the intro where the link up goes", () => {
    expect(splitUp("Part of our guide to [[up]].")).toEqual(["Part of our guide to ", "."]);
    expect(splitUp("No link here.")).toEqual(["No link here.", ""]);
  });

  it("reads Sanity's portable text back into sections", () => {
    const b = (text: string, style = "normal") => ({ _type: "block", style, children: [{ text }] });
    expect(toSections([b("Life on board", "h2"), b("One."), b("Two."), b("Where", "h2"), b("Three.")])).toEqual([
      { heading: "Life on board", paragraphs: ["One.", "Two."] },
      { heading: "Where", paragraphs: ["Three."] },
    ]);
  });
});

describe("maintained data (DATA-009)", () => {
  it("shows the catalogue's guest and cabin ranges, or says they vary", () => {
    const p = profileWithStats("sail", { vessels: 251, guests: [12, 20], cabins: [6, 10] });
    expect(p.rows.guests).toBe("12–20");
    expect(p.rows.cabins).toBe("6–10");
    expect(p.facts[0]).toEqual(["users", "12–20 guests"]);
    expect(profileWithStats("steam", undefined).rows.guests).toBe("Varies by vessel");
    expect(p.sample).toBe(false);
  });
});

describe("structured data and the site search (SEO-028)", () => {
  it("home declares a site search on the cruise listing", () => {
    expect(websiteJsonLd("https://x")).toMatchObject({
      potentialAction: { target: { urlTemplate: "https://x/cruises/?q={search_term_string}" } },
    });
  });

  it("the cruise listing finds vessels by name", () => {
    const v = (name: string) => ({ name, type: "motor", itineraries: [], maxGuests: 10 }) as unknown as ListingVessel;
    const q = parseSearch({ q: "oberoi zahra" });
    expect(applySearch([v("Oberoi Zahra"), v("Sanctuary Sun Boat")], q).vessels.map((x) => x.name)).toEqual(["Oberoi Zahra"]);
  });

  it("emits FAQPage only for pages with questions", () => {
    expect(faqJsonLd({ ...DRAFT_PAGES.P027!, faqs: [] })).toBeNull();
    expect(faqJsonLd(DRAFT_PAGES.P027!)).toMatchObject({ "@type": "FAQPage" });
  });
});
