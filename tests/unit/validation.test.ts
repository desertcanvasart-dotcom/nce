import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { RESERVED_VESSEL_SLUGS, slugify } from "@/lib/data/slugs";
import {
  mediaCreate,
  money,
  parseInput,
  profileRoleChange,
  profileSelfUpdate,
  vesselCreate,
  vesselUpdate,
  withInput,
} from "@/server/validation";

const ids = { vessel: "00000000-0000-4000-8000-000000000001", dest: "00000000-0000-4000-9000-000000000001" };

describe("reserved slugs (SEO-030)", () => {
  it("match the database function", () => {
    const dir = join(import.meta.dirname, "../../supabase/migrations");
    const sql = readdirSync(dir)
      .map((f) => readFileSync(join(dir, f), "utf8"))
      .join("\n");
    const body = /is_reserved_slug[\s\S]*?array\[([\s\S]*?)\]/.exec(sql)?.[1] ?? "";
    const inDb = [...body.matchAll(/'([^']+)'/g)].map((m) => m[1]).sort();
    expect(inDb).toEqual([...RESERVED_VESSEL_SLUGS].sort());
  });

  it.each(RESERVED_VESSEL_SLUGS)("rejects %s as a vessel slug", (s) => {
    const r = parseInput(vesselCreate, { name: "X", type: "motor", slug: s, visibility: "private" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.slug?.[0]).toMatch(/reserved/);
  });
});

describe("slugify", () => {
  it("makes ASCII slugs", () => {
    expect(slugify("MS Amwaj Living Stone")).toBe("ms-amwaj-living-stone");
    expect(slugify("Dahabiya Nour El Nil — Sun & Moon")).toBe("dahabiya-nour-el-nil-sun-and-moon");
    expect(slugify("Éloïse")).toBe("eloise");
    expect(slugify("  --  ")).toBe("");
  });
});

describe("vessel schemas", () => {
  it("accepts a complete draft", () => {
    const r = parseInput(vesselCreate, {
      name: " Sample ",
      type: "sail",
      slug: "sample-sail",
      visibility: "private",
      cabin_count: 6,
      route_text: "",
    });
    expect(r).toEqual({
      ok: true,
      data: { name: "Sample", type: "sail", slug: "sample-sail", visibility: "private", cabin_count: 6, route_text: null },
    });
  });

  it("rejects unknown types and impossible counts", () => {
    const r = parseInput(vesselUpdate, { type: "felucca", cabin_count: 0, year_built: 1700 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["cabin_count", "type", "year_built"]);
  });

  it("an operator update cannot carry admin fields", () => {
    const r = parseInput(vesselUpdate, { visibility: "published", slug: "x" });
    expect(r).toEqual({ ok: true, data: {} }); // stripped, and the database trigger refuses them anyway
  });
});

describe("media (BRAND-014)", () => {
  const base = { width: 1600, height: 900 };
  it("needs exactly one parent", () => {
    expect(parseInput(mediaCreate, { ...base, storage_path: `vessels/${ids.vessel}/a.jpg` }).ok).toBe(false);
    expect(
      parseInput(mediaCreate, {
        ...base,
        vessel_id: ids.vessel,
        destination_id: ids.dest,
        storage_path: `vessels/${ids.vessel}/a.jpg`,
      }).ok,
    ).toBe(false);
    expect(parseInput(mediaCreate, { ...base, vessel_id: ids.vessel, storage_path: `vessels/${ids.vessel}/a.jpg` }).ok).toBe(
      true,
    );
  });
  it("keeps the file under its parent", () => {
    const r = parseInput(mediaCreate, { ...base, vessel_id: ids.vessel, storage_path: `destinations/${ids.dest}/a.jpg` });
    expect(r.ok).toBe(false);
  });
});

describe("identity", () => {
  it("self-update refuses role fields", () => {
    expect(parseInput(profileSelfUpdate, { full_name: "A", platform_role: "admin" }).ok).toBe(false);
    expect(parseInput(profileSelfUpdate, { locale: "ja" }).ok).toBe(true);
  });
  it("admin roles only for admins", () => {
    const user_id = ids.vessel;
    expect(parseInput(profileRoleChange, { user_id, platform_role: "customer", admin_role: "finance" }).ok).toBe(false);
    expect(parseInput(profileRoleChange, { user_id, platform_role: "admin", admin_role: "finance" }).ok).toBe(true);
  });
});

describe("money (DATA-001)", () => {
  it("is integer minor units with an ISO code", () => {
    expect(parseInput(money, { amount: 124000, currency: "USD" }).ok).toBe(true);
    expect(parseInput(money, { amount: 1240.5, currency: "USD" }).ok).toBe(false);
    expect(parseInput(money, { amount: 100, currency: "usd" }).ok).toBe(false);
  });
});

describe("withInput (SEC-004)", () => {
  it("never runs the action on invalid input", async () => {
    let ran = false;
    const action = withInput(money, async () => {
      ran = true;
      return "ok";
    });
    expect(await action({ amount: "1" })).toMatchObject({ ok: false });
    expect(ran).toBe(false);
    expect(await action({ amount: 1, currency: "EGP" })).toEqual({ ok: true, data: "ok" });
  });
});
