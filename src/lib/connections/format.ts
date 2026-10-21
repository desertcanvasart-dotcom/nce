import { XMLParser, XMLValidator } from "fast-xml-parser";
import type { RatePlan } from "@/lib/product/pricing";

/**
 * Nilecruz inventory format v1 (ADR-080): the JSON/XML feed of the nile-cruise-marketplace spec (v3 §2.2),
 * extended with cabin-type codes, occupancy, rate plan and the time availability was confirmed.
 * The same format is pasted (DASH-OPR-024), pulled from a feed (DASH-OPR-025) and sent to the API (DASH-OPR-026).
 *
 * This module turns a document into one row per sailing and cabin type. It checks what can be checked without the
 * database (shapes, dates, numbers, codes); the database then checks the rest (app.apply_inventory_rows): that the
 * vessel is the company's, that the sailing exists, the cabin's occupancy, the E£ rule, and that newer data wins.
 */

export const FORMAT_ID = "nilecruz-inventory/1";
export const LIMITS = { pasteBytes: 2_000_000, apiBytes: 2_000_000, feedBytes: 5_000_000, rows: 5000 } as const;
const CURRENCIES = ["USD", "EUR", "EGP"] as const;
const PLANS: RatePlan[] = ["international", "egyptian_citizen", "foreign_resident", "trade"];
const CODE = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,39}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
// ISO 8601 with a time zone, e.g. 2026-10-18T09:30:00Z or 2026-10-18T11:30:00+02:00.
const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,6})?)?(Z|[+-]\d{2}:\d{2})$/;
const PRICE = /^\d{1,8}(\.\d{1,2})?$/;

/** ADR-102: "with_sightseeing" only for vessels Nilecruz has approved; without "package" a rate is cruise only. */
export const PACKAGES = ["cruise", "with_sightseeing"] as const;
export type RateIn = {
  occupancy: number;
  plan: RatePlan;
  currency: (typeof CURRENCIES)[number];
  amount_minor: number;
  package: (typeof PACKAGES)[number];
};
export type InventoryRow = {
  label: string;
  vessel: string;
  date: string;
  schedule: string | null;
  cabin: string;
  available: number | null;
  confirmed_at: string | null;
  rates: RateIn[];
  errors: string[];
  warnings: string[];
};

/** A problem with the whole document: nothing in it is used. */
export class FormatError extends Error {}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const list = (v: unknown): unknown[] => (v === undefined || v === null ? [] : Array.isArray(v) ? v : [v]);
/** A field from JSON (`name`) or XML (an attribute `@_name`, or a child element `<name>`). */
function field(o: Obj, name: string): unknown {
  const v = o[`@_${name}`] ?? o[name];
  return isObj(v) && "#text" in v ? v["#text"] : v;
}
function text(v: unknown): string | null {
  if (typeof v === "string") return v.trim() === "" ? null : v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return null;
}

/** "1250.5" or 1250.5 → 125050 minor units. Never through floating point (DATA-001). */
export function priceToMinor(v: unknown): number | null {
  const s = text(v);
  if (s === null || !PRICE.test(s)) return null;
  const [whole, frac = ""] = s.split(".");
  const minor = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  return minor > 0 ? minor : null;
}

function realDate(s: string): boolean {
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

type RawCabin = { type: unknown; available: unknown; confirmedAt: unknown; rates: Obj[]; legacyPrice: unknown };
type RawDate = { date: unknown; schedule: unknown; cabins: RawCabin[] };
type RawCruise = { id: unknown; dates: RawDate[] };

function fromJson(doc: unknown): { format: unknown; cruises: RawCruise[] } {
  if (!isObj(doc)) throw new FormatError("The data must be a JSON object with a “cruises” list.");
  return {
    format: doc.format,
    cruises: list(doc.cruises)
      .filter(isObj)
      .map((c) => ({
        id: c.id,
        dates: list(c.availability)
          .filter(isObj)
          .map((d) => ({
            date: d.date,
            schedule: d.schedule,
            cabins: list(d.cabins)
              .filter(isObj)
              .map((k) => ({
                type: k.type,
                available: k.available,
                confirmedAt: k.confirmed_at,
                rates: list(k.rates).filter(isObj),
                legacyPrice: k.price,
              })),
          })),
      })),
  };
}

function fromXml(doc: Obj): { format: unknown; cruises: RawCruise[] } {
  const root = doc.feed ?? doc.inventory;
  if (!isObj(root)) throw new FormatError("The XML must have a <feed> root element with <cruises>.");
  const cruisesEl = root.cruises;
  return {
    format: field(root, "format"),
    cruises: list(isObj(cruisesEl) ? cruisesEl.cruise : undefined)
      .filter(isObj)
      .map((c) => {
        const av = c.availability;
        return {
          id: field(c, "id"),
          dates: list(isObj(av) ? av.date : undefined)
            .filter(isObj)
            .map((d) => ({
              date: d["@_date"],
              schedule: d["@_schedule"],
              cabins: list(d.cabin)
                .filter(isObj)
                .map((k) => ({
                  type: field(k, "type"),
                  available: field(k, "available"),
                  confirmedAt: field(k, "confirmed_at"),
                  rates: list(k.rate).filter(isObj),
                  legacyPrice: field(k, "price"),
                })),
            })),
        };
      }),
  };
}

const LIST_TAGS = new Set(["cruise", "date", "cabin", "rate"]);

function parseXml(raw: string): Obj {
  // SEC-007: no DTDs and no entity declarations at all (external entities, "billion laughs").
  if (/<!DOCTYPE|<!ENTITY/i.test(raw)) {
    throw new FormatError("XML with a DOCTYPE or entity declarations is not accepted. Remove the <!DOCTYPE …> line.");
  }
  const valid = XMLValidator.validate(raw);
  if (valid !== true) throw new FormatError(`This isn’t valid XML (line ${valid.err.line}): ${valid.err.msg}`);
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    parseTagValue: false,
    parseAttributeValue: false,
    processEntities: false,
    htmlEntities: false,
    ignoreDeclaration: true,
    ignorePiTags: true,
    maxNestedTags: 20,
    isArray: (name) => LIST_TAGS.has(name),
  });
  return parser.parse(raw) as Obj;
}

/** Parses a document in format v1 (JSON or XML) into rows. Throws FormatError when nothing in it can be used. */
export function parseInventory(raw: string, { maxBytes = LIMITS.pasteBytes as number, contentType = "" } = {}): InventoryRow[] {
  if (new TextEncoder().encode(raw).length > maxBytes) {
    throw new FormatError(`The data is larger than ${Math.round(maxBytes / 1_000_000)} MB. Send it in smaller parts.`);
  }
  const trimmed = raw.replace(/^﻿/, "").trim();
  if (!trimmed) throw new FormatError("There is nothing to read.");
  const xml = trimmed.startsWith("<") || /xml/i.test(contentType);
  let shaped: { format: unknown; cruises: RawCruise[] };
  if (xml) {
    shaped = fromXml(parseXml(trimmed));
  } else {
    let doc: unknown;
    try {
      doc = JSON.parse(trimmed);
    } catch (e) {
      throw new FormatError(`This isn’t valid JSON or XML: ${(e as Error).message}`);
    }
    shaped = fromJson(doc);
  }
  if (shaped.format !== undefined && shaped.format !== FORMAT_ID) {
    throw new FormatError(`Unknown format “${String(shaped.format)}”. This version reads “${FORMAT_ID}”.`);
  }

  const rows: InventoryRow[] = [];
  for (const c of shaped.cruises) {
    const vessel = (text(c.id) ?? "").toLowerCase();
    for (const d of c.dates) {
      const date = text(d.date) ?? "";
      const schedule = text(d.schedule);
      for (const k of d.cabins) {
        if (rows.length >= LIMITS.rows) {
          throw new FormatError(`More than ${LIMITS.rows.toLocaleString("en")} rows. Send the data in smaller parts.`);
        }
        rows.push(toRow(vessel, date, schedule, k));
      }
    }
  }
  if (!rows.length) {
    throw new FormatError("No availability found. Each cruise needs an “availability” list of dates with cabins.");
  }
  return rows;
}

function toRow(vessel: string, date: string, schedule: string | null, k: RawCabin): InventoryRow {
  const errors: string[] = [];
  const warnings: string[] = [];
  const cabin = text(k.type) ?? "";
  if (!vessel) errors.push("The cruise has no “id” (the vessel’s Nilecruz slug).");
  else if (!SLUG.test(vessel)) errors.push(`“${vessel}” isn’t a vessel slug (lower-case letters, numbers and hyphens).`);
  if (!DATE.test(date) || !realDate(date)) errors.push(`“${date || "(empty)"}” isn’t a date in the form YYYY-MM-DD.`);
  if (schedule !== null && !CODE.test(schedule)) errors.push(`“${schedule}” isn’t a schedule code.`);
  if (!cabin) errors.push("A cabin has no “type” (the cabin type’s code).");
  else if (!CODE.test(cabin)) errors.push(`“${cabin}” isn’t a cabin type code.`);

  const availText = text(k.available);
  const available = availText !== null && /^\d{1,3}$/.test(availText) ? Number(availText) : null;
  if (available === null || available > 400) errors.push("“available” must be a whole number of cabins from 0 to 400.");

  let confirmed: string | null = null;
  const conf = text(k.confirmedAt);
  if (conf !== null) {
    if (!INSTANT.test(conf) || Number.isNaN(Date.parse(conf))) {
      errors.push(`“${conf}” isn’t a time with a time zone, such as 2026-10-18T09:30:00Z.`);
    } else confirmed = new Date(conf).toISOString();
  }

  const rates: RateIn[] = [];
  for (const r of k.rates) {
    const occText = text(field(r, "occupancy"));
    const occupancy = occText !== null && /^[1-3]$/.test(occText) ? Number(occText) : null;
    const plan = text(field(r, "plan")) as RatePlan | null;
    const currency = text(field(r, "currency"))?.toUpperCase() ?? null;
    const amount = priceToMinor(field(r, "price"));
    const pkg = text(field(r, "package"))?.toLowerCase() ?? "cruise";
    const bad: string[] = [];
    if (occupancy === null) bad.push("“occupancy” must be 1, 2 or 3 guests");
    if (!plan || !PLANS.includes(plan)) bad.push(`“plan” must be one of ${PLANS.join(", ")}`);
    if (!currency || !(CURRENCIES as readonly string[]).includes(currency)) bad.push("“currency” must be USD, EUR or EGP");
    if (amount === null) bad.push("“price” must be a positive amount per person with at most two decimals, such as 1250.00");
    if (!(PACKAGES as readonly string[]).includes(pkg)) bad.push("“package” must be cruise or with_sightseeing");
    if (bad.length) errors.push(`A rate can’t be read: ${bad.join("; ")}.`);
    else
      rates.push({
        occupancy: occupancy!,
        plan: plan!,
        currency: currency as RateIn["currency"],
        amount_minor: amount!,
        package: pkg as RateIn["package"],
      });
  }
  if (!k.rates.length && k.legacyPrice !== undefined) {
    warnings.push("The cabin’s “price” was ignored: give prices as “rates” with occupancy, plan and currency (format v1).");
  }

  const label = `${vessel || "?"} · ${date || "?"}${schedule ? ` (${schedule})` : ""} · ${cabin || "?"}`;
  return { label, vessel, date, schedule, cabin, available, confirmed_at: confirmed, rates, errors, warnings };
}
