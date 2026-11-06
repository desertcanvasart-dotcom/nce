/**
 * An operator's fleet file (e.g. docs/imports/nour-el-nil-fleet-data.json) and its translations, turned into catalogue
 * rows for the existing vessel page. Pure, so the unit tests run it on the file. The rules come from the file and
 * Islam's import brief (4 Nov 2026):
 * - fleet_defaults first, then each vessel's own values; cabin_type_defaults under each cabin type's own values;
 * - a null field, a field whose status is needs_confirmation, or one marked display: false is stored nowhere public;
 * - every boat is information only (showcase, never bookable), with no evaluation, score or deck plan;
 * - a boat with publish: false is skipped;
 * - propulsion comes from the data, never from the name.
 */

type Json = Record<string, unknown>;
export type Locale = "en" | "es" | "ja";
const LOCALES: Locale[] = ["en", "es", "ja"];
const PROPULSIONS = ["motor", "wind", "steam"] as const;
export type FleetPropulsion = (typeof PROPULSIONS)[number];
const VESSEL_TYPES: Record<string, "sail" | "motor" | "steam"> = {
  dahabiya: "sail",
  motor_ship: "motor",
  paddle_steamer: "steam",
};
/** The file's shared spaces in the catalogue's words. */
const SPACES: Record<string, string> = {
  "Top deck": "sun_deck",
  "Sun deck": "sun_deck",
  Salon: "lounge",
  Lounge: "lounge",
  Bar: "bar",
  "Dining salon": "dining_room",
  "Dining room": "dining_room",
  Library: "library",
};
const ISO_DAY: Record<string, number> = {
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
  Sunday: 7,
};
/** The deck an imported cabin type gets when the operator hasn't said (UNKNOWN_DECK on the page: nothing is drawn). */
export const NO_DECK = "To be confirmed";
/** The life-on-board notes taken from on_board, in this order; food and diets go to the dining text instead. */
const ON_BOARD = ["air_conditioning", "fans", "wifi", "laundry"] as const;

export type FleetFile = {
  meta: Json;
  operator: { id: string; name: string; website?: string; partner_status?: string };
  fleet_defaults: Json;
  cabin_type_defaults: Record<string, Json>;
  vessels: Json[];
};
type Words = Partial<Record<Locale, string>>;
export type FleetI18n = {
  review: { status: string; note: string };
  fleet: {
    propulsion_support: Words;
    included: Partial<Record<Locale, string[]>>;
    not_included: Partial<Record<Locale, string[]>>;
    boarding_note: Words;
    programme: Partial<Record<Locale, { title: string; text: string }[]>>;
    /** Each itinerary's days by its id, for a boat with more than one; `programme` serves the first otherwise. */
    programmes?: Record<string, Partial<Record<Locale, { title: string; text: string }[]>>>;
    on_board: Record<string, Words>;
    dining: Words;
    less_suited_to: Words;
    good_to_know: Record<"children" | "mobility" | "charter" | "route_note" | "season", Words>;
    seo_title: Words;
    seo_description_suffix: Words;
  };
  cabin_types: Record<string, { name?: Words; beds?: Words; bathrooms?: Words; feature?: Words }>;
  extras: Record<string, Words>;
  summaries: Record<string, Words>;
  descriptions?: Record<string, Words>;
  /** A photo on the operator's site (url), or one kept in this repository (path, under docs/imports/photos/). */
  photos: Record<string, { url?: string; path?: string; cabin?: string; alt: Words }[]>;
};

export type CabinPlan = {
  code: string;
  name: string;
  active: boolean;
  size_m2: number | null;
  bed_configuration: string | null;
  max_occupancy: number;
  view: string | null;
  cabin_count: number | null;
  sort_order: number;
  translations: {
    locale: Locale;
    name: string | null;
    description: string | null;
    bed_configuration: string | null;
    view: string | null;
  }[];
};

export type VesselPlan = {
  slug: string;
  /** The vessel's address in an earlier import (its id in the file), renamed when the names match. */
  renameFrom: string;
  name: string;
  displayName: string | null;
  type: "sail" | "motor" | "steam";
  propulsion: FleetPropulsion;
  cabinCount: number | null;
  maxGuests: number | null;
  yearBuilt: number | null;
  yearRenovated: number | null;
  lengthM: number | null;
  beamM: number | null;
  sharedSpaces: string[];
  /** Per person for the whole cruise, sharing a double room; never turned into a nightly figure. */
  indicative: { amountMinor: number; currency: string; nights: number } | null;
  /** The fleet data's date: when a public price from it was last checked. */
  checkedOn: string;
  /**
   * Who can book it (Islam, 6 Nov 2026): a boat Nilecruz can't sell shows no price or booking, and may name a travel
   * company that takes enquiries for it (never the operator).
   */
  booking: {
    availability: "available_through_nilecruz" | "not_available_through_nilecruz";
    relationship: "agreement" | "none" | null;
    enquiry: { name: string; email: string } | null;
  };
  showcaseReason: string;
  translations: {
    locale: Locale;
    summary: string | null;
    description: string | null;
    dining: string | null;
    good_for: null;
    less_suited_to: string | null;
    included: string[];
    optional_extras: string[];
    not_included: string[];
    propulsion_note: string | null;
    on_board: string[];
    good_to_know: string[];
    seo_title: string | null;
    seo_description: string | null;
  }[];
  cabins: CabinPlan[];
  itineraries: {
    code: string;
    origin: string;
    destination: string;
    nights: number;
    /** Empty when the departure day needs confirmation: then no dates are generated. */
    sailingDays: number[];
    periods: { starts_on: string; ends_on: string }[];
    days: { locale: Locale; day_number: number; title: string; description: string }[];
    boarding: { locale: Locale; boarding_note: string }[];
  }[];
  photos: {
    url: string | null;
    path: string | null;
    file: string;
    cabin: string | null;
    sort_order: number;
    alt: Record<Locale, string>;
  }[];
  sourceUrls: string[];
  /** Who the photos come from, credited under each. */
  credit: string;
  verificationNote: string;
  /** Fields stored or held back but not shown to visitors, for the report. */
  hidden: string[];
};

export type FleetPlan = { vessels: VesselPlan[]; skipped: { slug: string; reason: string }[]; problems: string[] };

const isObj = (x: unknown): x is Json => !!x && typeof x === "object" && !Array.isArray(x);
/** A field that may be shown: not null, not needs_confirmation, not display: false. */
export function shown(x: unknown): boolean {
  if (x === null || x === undefined) return false;
  if (isObj(x)) {
    if (x.status === "needs_confirmation") return false;
    if (x.display === false) return false;
  }
  return true;
}
/** `{ value, status }` fields: the value when it may be shown. */
const valueOf = <T>(x: unknown): T | null => (shown(x) && isObj(x) && "value" in x ? (x.value as T) : null);

/** Defaults first, then the vessel's own values (a whole field replaces the default's). */
/** A vessel's own values over the defaults; an object in both (on_board, inclusions) is merged one level down. */
export const withDefaults = (defaults: Json, own: Json): Json =>
  Object.fromEntries(
    Object.entries({ ...defaults, ...own }).map(([k, v]) => [
      k,
      isObj(v) && isObj(defaults[k]) && k in own ? { ...(defaults[k] as Json), ...v } : v,
    ]),
  );

/** Every path under a vessel that the display rule hides, with why. */
export function hiddenPaths(x: unknown, path = ""): string[] {
  if (x === null) return [`${path}: empty`];
  if (Array.isArray(x)) return x.flatMap((v, i) => hiddenPaths(v, `${path}[${i}]`));
  if (!isObj(x)) return [];
  if (x.status === "needs_confirmation") return [`${path}: needs confirmation`];
  if (x.display === false) return [`${path}: display false`];
  return Object.entries(x).flatMap(([k, v]) => {
    const at = path ? `${path}.${k}` : k;
    // A block of notes the file itself holds back (e.g. gratuities, where the operator's sources disagree).
    if (k === "needs_confirmation" && isObj(v)) return Object.keys(v).map((n) => `${at}.${n}: needs confirmation`);
    return hiddenPaths(v, at);
  });
}

/** "52 × 8.2" → [52, 8.2]. */
export function dimensions(x: unknown): [number, number] | null {
  if (!shown(x) || !isObj(x) || typeof x.display !== "string") return null;
  const m = x.display.match(/^\s*(\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)\s*$/);
  return m ? [Number(m[1]), Number(m[2])] : null;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (s: string, n: number) => {
  const d = new Date(`${s}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
};

/**
 * The date ranges a weekly pattern runs in: from `today` through `months` calendar months, skipping closed months.
 * A cruise must start and end in an open month, so each range stops `nights` days before its closed months begin.
 */
export function openPeriods(
  today: string,
  closed: number[],
  nights: number,
  months = 20,
): { starts_on: string; ends_on: string }[] {
  const out: { starts_on: string; ends_on: string }[] = [];
  const [y, m] = today.split("-").map(Number) as [number, number];
  let start: string | null = null;
  for (let i = 0; i <= months; i++) {
    const year = y + Math.floor((m - 1 + i) / 12);
    const month = ((m - 1 + i) % 12) + 1;
    const first = `${year}-${String(month).padStart(2, "0")}-01`;
    const open = !closed.includes(month);
    if (open && !start) start = i === 0 ? today : first;
    const last = addDays(`${month === 12 ? year + 1 : year}-${String(month === 12 ? 1 : month + 1).padStart(2, "0")}-01`, -1);
    const closesNext = closed.includes((month % 12) + 1) || i === months;
    if (open && start && closesNext) {
      const end = closed.includes((month % 12) + 1) ? addDays(last, -nights) : last;
      if (end >= start) out.push({ starts_on: start, ends_on: end });
      start = null;
    }
  }
  return out;
}

const pick = (w: Words | undefined, l: Locale, en: string | null): string | null => (l === "en" ? en : (w?.[l] ?? null));
/** Between two sentences: a space, except in Japanese. */
const gap = (l: Locale) => (l === "ja" ? "" : " ");

export function planFleetImport(file: FleetFile, i18n: FleetI18n, today: string): FleetPlan {
  const problems: string[] = [];
  const skipped: FleetPlan["skipped"] = [];
  const vessels: VesselPlan[] = [];
  const f = i18n.fleet;

  for (const own of file.vessels) {
    const id = String(own.id);
    const slug = String(own.slug ?? "");
    if (own.publish !== true) {
      skipped.push({ slug: slug || id, reason: String(own.publish_block_reason ?? "publish is not true") });
      continue;
    }
    const v = withDefaults(file.fleet_defaults, own);
    const bad = (why: string) => problems.push(`${slug}: ${why}`);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) bad("bad slug");
    const type = VESSEL_TYPES[String(v.vessel_type)];
    if (!type) bad(`unknown vessel_type ${String(v.vessel_type)}`);
    const propulsion = PROPULSIONS.find((p) => p === v.propulsion);
    if (!propulsion) bad(`propulsion must be motor, wind or steam, not ${String(v.propulsion)}`);
    if (v.booking_status !== "information_only") bad("only information-only boats can be imported");
    const summaryEn = typeof v.summary === "string" ? v.summary.replace(/(\w)'(\w)/g, "$1’$2") : null;
    for (const l of ["es", "ja"] as const) if (summaryEn && !i18n.summaries[id]?.[l]) bad(`no ${l} summary`);

    const itinerariesIn = (Array.isArray(v.itineraries) ? v.itineraries : []) as Json[];
    const nights = Number(itinerariesIn[0]?.nights ?? 0);
    const price = v.indicative_price as Json | null;
    let indicative: VesselPlan["indicative"] = null;
    if (shown(price) && price) {
      if (!/per trip/.test(String(price.basis))) bad("indicative_price must be per person, per trip");
      indicative = { amountMinor: Math.round(Number(price.amount) * 100), currency: String(price.currency), nights };
    }
    const availability =
      v.booking_availability === undefined || v.booking_availability === "available_through_nilecruz"
        ? "available_through_nilecruz"
        : v.booking_availability === "not_available_through_nilecruz"
          ? "not_available_through_nilecruz"
          : null;
    if (!availability) bad(`unknown booking_availability ${String(v.booking_availability)}`);
    const relationship = v.commercial_relationship ?? null;
    if (relationship !== null && relationship !== "agreement" && relationship !== "none")
      bad(`unknown commercial_relationship ${String(relationship)}`);
    const partner = (v.enquiry_partner ?? null) as Json | null;
    const enquiry =
      partner && typeof partner.name === "string" && typeof partner.email === "string"
        ? { name: partner.name, email: partner.email }
        : null;
    if (partner && !enquiry) bad("enquiry_partner needs a name and an email");
    if (enquiry && availability !== "not_available_through_nilecruz")
      bad("an enquiry partner is only for a boat that can't be booked through Nilecruz");
    if (availability === "not_available_through_nilecruz" && indicative) bad("a boat we can't sell shows no price");
    const dims = dimensions(v.dimensions_m);
    const built = typeof v.built_year === "number" ? v.built_year : valueOf<number>(v.built_year);
    const renovated = typeof v.renovated_year === "number" ? v.renovated_year : valueOf<number>(v.renovated_year);
    if (built && renovated && renovated < built) bad(`renovated (${renovated}) before it was built (${built})`);
    const spacesIn = ((v.on_board as Json | undefined)?.shared_spaces as string[] | undefined) ?? [];
    const sharedSpaces = [...new Set(spacesIn.map((s) => SPACES[s]).filter((s): s is string => !!s))];
    for (const s of spacesIn) if (!SPACES[s]) bad(`unknown shared space ${s}`);

    const onBoard = (v.on_board ?? {}) as Json;
    const inclusions = (v.inclusions ?? {}) as Json;
    const suitability = (v.suitability ?? {}) as Json;
    const charter = (v.charter ?? {}) as Json;
    const season = (v.operating_season ?? {}) as Json;
    const support = v.propulsion_support as Json | null;
    const supportEn = shown(support) && support && typeof support.text === "string" ? support.text : null;
    // The site's typography: a curly apostrophe (there’s, Nour El Nil’s), as in every other text.
    const text = (x: unknown) => (typeof x === "string" && x.trim() ? x.replace(/(\w)'(\w)/g, "$1’$2") : null);
    const diningEn = [text(onBoard.food), text(onBoard.dietary)].filter(Boolean).join(" ") || null;
    const descriptionEn = text(v.description);
    const goodEn: [keyof FleetI18n["fleet"]["good_to_know"], string | null][] = [
      ["children", text(suitability.children)],
      ["mobility", text(suitability.mobility)],
      ["charter", charter.available === true ? text(charter.text) : null],
      ["route_note", text(v.route_note)],
      ["season", text(season.note)],
    ];
    const translations = LOCALES.map((l) => {
      const list = (en: string[], w: Partial<Record<Locale, string[]>>) => (l === "en" ? en : (w[l] ?? []));
      const confirmed = shown(inclusions) ? inclusions : {};
      const included = list((confirmed.included as string[] | undefined) ?? [], f.included ?? {});
      const notIncluded = list((confirmed.not_included as string[] | undefined) ?? [], f.not_included ?? {});
      const summary = l === "en" ? summaryEn : (i18n.summaries[id]?.[l] ?? null);
      const title = f.seo_title[l]?.replace("{name}", String(v.name)) ?? null;
      const suffix = f.seo_description_suffix[l];
      return {
        locale: l,
        summary,
        description: descriptionEn ? (l === "en" ? descriptionEn : (i18n.descriptions?.[id]?.[l] ?? null)) : null,
        dining: diningEn ? pick(f.dining, l, diningEn) : null,
        good_for: null,
        less_suited_to: text(suitability.less_suited_to) ? pick(f.less_suited_to, l, text(suitability.less_suited_to)) : null,
        included,
        optional_extras: [],
        not_included: notIncluded,
        propulsion_note: supportEn ? pick(f.propulsion_support, l, supportEn) : null,
        on_board: ON_BOARD.flatMap((k) => {
          const en = text(onBoard[k]);
          const w = en ? pick(f.on_board?.[k], l, en) : null;
          return w ? [w] : [];
        }),
        good_to_know: goodEn.flatMap(([k, en]) => {
          const w = en ? pick(f.good_to_know?.[k], l, en) : null;
          return w ? [w] : [];
        }),
        seo_title: title,
        seo_description: summary && suffix ? `${summary}${gap(l)}${suffix}` : null,
      };
    });
    // Every visitor text written in English is written in Spanish and Japanese too, list by list.
    const filled = (x: unknown) => (Array.isArray(x) ? x.length : x !== null);
    const en = translations[0] as Json;
    for (const t of translations.slice(1))
      for (const [k, x] of Object.entries(t))
        if (filled(en[k]) && (!filled(x) || (Array.isArray(x) && x.length !== (en[k] as unknown[]).length)))
          bad(`no ${t.locale} text for ${k}`);

    const cabinsIn = (Array.isArray(v.cabin_types) ? v.cabin_types : []) as Json[];
    const cabins: CabinPlan[] = cabinsIn.map((raw, i) => {
      const c = withDefaults(file.cabin_type_defaults[String(raw.type)] ?? {}, raw);
      const words = i18n.cabin_types[String(c.type)] ?? {};
      // A boat whose rooms differ from the type's usual beds names the type whose bed wording it shares (beds_as).
      const beds = i18n.cabin_types[String(c.beds_as ?? c.type)]?.beds;
      if (c.beds_as !== undefined && !beds) bad(`cabin ${String(c.type)}: no bed words for beds_as ${String(c.beds_as)}`);
      const active = c.display !== false;
      const extra = text(c.extra);
      const feature = text(c.feature);
      const bathrooms = typeof c.bathrooms === "number" && c.bathrooms > 1 ? words.bathrooms : undefined;
      const note = (l: Locale) =>
        [feature ? pick(words.feature, l, feature) : null, bathrooms?.[l] ?? null].filter(Boolean).join(gap(l)) || null;
      const maxGuests = Number(c.max_guests ?? 2);
      if (active) {
        if (!c.name) bad(`cabin ${String(c.type)} has no name`);
        if (maxGuests < 1 || maxGuests > 4) bad(`cabin ${String(c.type)}: guests must be 1–4`);
        for (const l of ["es", "ja"] as const) {
          if (!words.name?.[l]) bad(`cabin ${String(c.type)}: no ${l} name`);
          if (feature && !words.feature?.[l]) bad(`cabin ${String(c.type)}: no ${l} feature`);
          if (extra && !i18n.extras[extra]?.[l]) bad(`cabin ${String(c.type)}: no ${l} for "${extra}"`);
        }
      }
      return {
        code: String(c.type),
        name: String(c.name),
        active,
        size_m2: typeof c.area_m2 === "number" ? c.area_m2 : null,
        bed_configuration: active ? (beds?.en ?? null) : null,
        max_occupancy: maxGuests,
        view: extra,
        cabin_count: typeof c.count === "number" ? c.count : null,
        sort_order: i,
        translations: active
          ? LOCALES.map((l) => ({
              locale: l,
              name: l === "en" ? null : (words.name?.[l] ?? null),
              description: note(l),
              bed_configuration: l === "en" ? null : (beds?.[l] ?? null),
              view: l === "en" || !extra ? null : (i18n.extras[extra]?.[l] ?? null),
            }))
          : [],
      };
    });
    const units = valueOf<number>(v.accommodation_units);
    const counted = cabins.reduce((n, c) => n + (c.cabin_count ?? 0), 0);
    if (units !== null && counted > units) bad(`cabin types add up to ${counted}, more than ${units} units`);

    const plannedItineraries: VesselPlan["itineraries"] = itinerariesIn.map((itinerary, n) => {
      const code = String(itinerary.id);
      const itNights = Number(itinerary.nights ?? 0);
      const programme = (itinerary.programme as Json[] | undefined) ?? [];
      if (programme.length !== itNights + 1) bad(`${code}: ${programme.length} programme days for ${itNights} nights`);
      // The itinerary's own departure day when it gives one, else the boat's; only a confirmed one gives dates.
      const day = valueOf<string>("departure_day" in itinerary ? itinerary.departure_day : v.departure_day);
      const sailingDays = day && ISO_DAY[day] ? [ISO_DAY[day]!] : [];
      const closed = ((season.closed_months as number[] | undefined) ?? []).filter((m) => m >= 1 && m <= 12);
      const words = (l: Locale) => f.programmes?.[code]?.[l] ?? (n === 0 ? f.programme?.[l] : undefined);
      const days = LOCALES.flatMap((l) =>
        programme.map((p, i) => {
          const w = l === "en" ? { title: text(p.title) ?? "", text: text(p.text) ?? "" } : words(l)?.[i];
          if (!w) bad(`${code}: no ${l} programme for day ${i + 1}`);
          return { locale: l, day_number: i + 1, title: w?.title ?? "", description: w?.text ?? "" };
        }),
      );
      const boardingEn = text(itinerary.boarding_note);
      return {
        code,
        origin: String(itinerary.from),
        destination: String(itinerary.to),
        nights: itNights,
        sailingDays,
        // A confirmed weekly day gives expected dates in the open months; an unconfirmed one gives none.
        periods: sailingDays.length ? openPeriods(today, closed, itNights) : [],
        days,
        boarding: boardingEn
          ? LOCALES.flatMap((l) => {
              const w = pick(f.boarding_note, l, boardingEn);
              return w ? [{ locale: l, boarding_note: w }] : [];
            })
          : [],
      };
    });

    const photos = (i18n.photos[id] ?? []).map((p, i) => {
      const from = p.path ?? p.url ?? "";
      const name = p.path ? (p.path.split("/").pop() ?? "") : p.url ? (new URL(p.url).pathname.split("/").pop() ?? "") : "";
      const file = decodeURIComponent(name).replace(/[^A-Za-z0-9._-]/g, "-");
      for (const l of LOCALES) if (!p.alt[l]?.trim()) bad(`photo ${file || from}: no ${l} alt text`);
      if (p.cabin && !cabins.some((c) => c.code === p.cabin && c.active)) bad(`photo ${file}: no cabin ${p.cabin}`);
      if (!!p.url === !!p.path) bad(`photo ${file || i}: give a url or a path, not both`);
      if (p.url && !/^https:\/\//.test(p.url)) bad(`photo ${file}: not an https address`);
      if (p.path && !/^docs\/imports\/photos\/[A-Za-z0-9._/-]+\.(jpe?g|png|webp)$/.test(p.path))
        bad(`photo ${file}: a path must be a JPEG, PNG or WebP under docs/imports/photos/`);
      return {
        url: p.url ?? null,
        path: p.path ?? null,
        file,
        cabin: p.cabin ?? null,
        sort_order: i,
        alt: { en: p.alt.en ?? "", es: p.alt.es ?? "", ja: p.alt.ja ?? "" },
      };
    });

    const hidden = [
      ...hiddenPaths(v).filter((h) => !/^(gallery|evaluation|deck_plan|cabin_types\[)/.test(h)),
      "evaluation and score: none (information only)",
      "deck plan: hidden (no numbered plan)",
      ...cabins.filter((c) => !c.active).map((c) => `cabin_types.${c.code}: display false (kept out of the cabin cards)`),
      ...(cabinsIn.some((c) => "rate_eur_regular_season" in c)
        ? ["cabin_types[].rate_eur_regular_season: stored in the import file only, not shown (operator rate model)"]
        : []),
    ];
    const operator = file.operator;
    vessels.push({
      slug,
      renameFrom: id,
      name: String(v.name),
      displayName: text(v.display_name),
      type: type ?? "sail",
      propulsion: propulsion ?? "wind",
      cabinCount: units,
      maxGuests: valueOf<number>(v.guest_capacity),
      yearBuilt: typeof v.built_year === "number" ? v.built_year : valueOf<number>(v.built_year),
      yearRenovated: typeof v.renovated_year === "number" ? v.renovated_year : valueOf<number>(v.renovated_year),
      lengthM: dims?.[0] ?? null,
      beamM: dims?.[1] ?? null,
      sharedSpaces,
      indicative,
      checkedOn: String(file.meta.updated_on ?? file.meta.researched_on ?? ""),
      booking: {
        availability: availability ?? "available_through_nilecruz",
        relationship: (relationship as "agreement" | "none" | null) ?? null,
        enquiry,
      },
      showcaseReason: `Information only: ${operator.name} fleet (${(operator.partner_status ?? "permission unknown").replace(/_/g, " ")}, ${String(file.meta.updated_on ?? file.meta.researched_on ?? "")}). Not bookable on Nilecruz.`,
      translations,
      cabins,
      itineraries: plannedItineraries,
      photos,
      sourceUrls: [String(v.source_url ?? ""), operator.website ?? ""].filter(Boolean),
      credit: operator.name.replace(/\s*\(.*\)$/, ""),
      verificationNote: [
        `${operator.name} fleet import (${String(file.meta.dataset ?? "")}, ${String(file.meta.updated_on ?? "")}).`,
        `Spanish and Japanese: ${i18n.review.status.replace(/_/g, " ")}.`,
        `Not shown: ${hidden.join("; ")}.`,
      ].join(" "),
      hidden,
    });
  }
  return { vessels, skipped, problems };
}
