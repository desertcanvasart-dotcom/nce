import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ds/Badge/Badge";
import { ItineraryTimeline } from "@/components/ds/ItineraryTimeline/ItineraryTimeline";
import { Media } from "@/components/ds/Media/Media";
import { formatDate, formatMoney, formatNights } from "@/components/ds/lib/format";
import { propulsionArt, propulsionIcon, type Money } from "@/components/ds/lib/types";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { EvaluationRadar } from "@/components/evaluation/EvaluationRadar";
import { DIETARY_OPTIONS } from "@/lib/catalogue/dining";
import { DIMENSIONS } from "@/lib/evaluation/method";
import { jsonLdScript, type ListingVessel } from "@/lib/marketplace/listing";
import { hasFigure, sellsThroughUs, type PublicPrice } from "@/lib/marketplace/public-price";
import {
  formatDay,
  nightsOf,
  stopsFor,
  touristTripJsonLd,
  type VesselItinerary,
  type VesselPage,
} from "@/lib/marketplace/vessel";
import { arriveDayBefore } from "@/lib/product/sailing-time";
import { isBuilt } from "@/lib/seo/links";
import { absoluteUrl } from "@/lib/seo/metadata";
import { calendarSailings, headingOf, patternLines, usualLines, withUsualYear } from "@/lib/marketplace/sailing-calendar";
import { Breadcrumbs } from "./Breadcrumbs";
import { MooringExplainer } from "@/components/mooring/MooringExplainer";
import { CabinsAndDecks } from "./CabinsAndDecks";
import { VesselPhotos } from "./VesselPhotos";
import { ItinerarySwitch } from "./ItinerarySwitch";
import { AddToCompare, CompareTray } from "./CompareTray";
import { RatesForm, type RatesAction } from "./RatesForm";
import { SailingCalendar } from "./SailingCalendar";
import { SectionNav, type NavItem } from "./SectionNav";
import styles from "./VesselPage.module.css";

const TYPE_FACET = { sail: "dahabiyas", motor: "motor-ships" } as const;
const HUB = { sail: "/vessels/dahabiya/", motor: "/vessels/motor-cruise-ships/", steam: "/vessels/paddle-steamers/" } as const;
// Upper Egypt from north to south: a route reads "between Luxor and Aswan" whichever way it sails.
const RIVER = ["cairo", "luxor", "esna", "edfu", "kom ombo", "aswan"];
const riverIndex = (place: string) => {
  const i = RIVER.indexOf(place.trim().toLowerCase());
  return i < 0 ? RIVER.length : i;
};
/** A site link written [words](/path/) in vessel data: a link when the page exists, else just the words. */
const LINKED = /\[([^\]]+)\]\((\/[^)\s]*)\)/g;

type Say = (key: string, values?: Record<string, string | number>) => string;

/**
 * The words the vessel page builds from its data, in the page's language: the route line, guide totals, sailing days,
 * title and description. Shared by the page and its metadata, so both always say the same thing.
 */
export function vesselWords(v: VesselPage, locale: Locale, t: Say, raw: (key: string) => unknown) {
  const tag = locale === "en" ? "en-GB" : locale;
  const list = (xs: string[], type: "conjunction" | "disjunction" = "conjunction") =>
    new Intl.ListFormat(tag, { type }).format(xs);
  const places = raw("places") as Record<string, string>;
  const place = (name: string) => places[name] ?? name;
  const money = (m: Money) => formatMoney(m, locale);
  const plural = raw("weekdaysPlural") as string[];
  const days = (ds: number[]) => list([...ds].sort((a, b) => a - b).map((d) => plural[d - 1]!));
  const its = v.itineraries;
  const nights = nightsOf(its);
  // "3 and 4", "3 y 4"; Japanese joins lengths with a middle dot ("3・4泊").
  const nightsList = locale === "ja" ? nights.join("・") : list(nights.map(String));
  const ends = [...new Set(its.flatMap((i) => [i.origin, i.destination]))].sort((a, b) => riverIndex(a) - riverIndex(b));
  const between = ends.length === 2;
  const sailings = its
    .filter((i) => i.sailingDays.length)
    .map((i) => t("hero.sailingsFrom", { days: days(i.sailingDays), origin: place(i.origin) }))
    .join(t("listSep"));
  return {
    tag,
    list,
    place,
    money,
    days,
    routeLine: !its.length
      ? null
      : between
        ? t("hero.routeBetween", { nights: nightsList, a: place(ends[0]!), b: place(ends[1]!) })
        : t("hero.routeMixed", { nights: nightsList }),
    sailings: sailings ? sailings.replace(/^./, (c) => c.toUpperCase()) : null,
    // A vessel's own search title and description, when its data has them, else the usual pattern.
    title:
      v.seoTitle ??
      (nights.length ? t("meta.title", { name: v.name, nights: nightsList }) : t("meta.titleOne", { name: v.name })),
    description: v.seoDescription
      ? v.seoDescription
      : !nights.length
        ? v.summary
        : between
          ? t("meta.description", { name: v.name, nights: nightsList, a: place(ends[0]!), b: place(ends[1]!) })
          : t("meta.descriptionRoute", { name: v.name, nights: nightsList }),
    trip: (it: VesselItinerary) =>
      t("meta.trip", {
        name: v.name,
        nights: formatNights(it.nights, locale),
        origin: place(it.origin),
        destination: place(it.destination),
      }),
  };
}

/**
 * PAGE-072: one page per vessel, in the order a traveller decides: what it is and roughly what it costs, whether it
 * suits them, what's included, the programme, cabins, our evaluation, life on board, dates, questions, other boats.
 * Every fact comes from the vessel's data; a section without data is left out, and so is its link in the section bar.
 */
export function VesselView({
  locale,
  v,
  similar = [],
  ogImage,
  today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" }),
  rates,
}: {
  locale: Locale;
  v: VesselPage;
  /** Up to three other public vessels of the same type. */
  similar?: ListingVessel[];
  /** The vessel's main photo at a stable address, for structured data. */
  ogImage?: string;
  /** Today in Cairo; injectable for tests. */
  today?: string;
  /** ADR-109: the "Check rates for your dates" server action, bound to this vessel; the form is left out without it. */
  rates?: RatesAction;
}) {
  const t = useTranslations("vesselPage");
  const tc = useTranslations("sailingCalendar");
  const td = useTranslations("ds");
  const tp = useTranslations("pricing");
  const w = vesselWords(
    v,
    locale,
    (k, x) => t(k, x),
    (k) => t.raw(k),
  );
  const path = `/cruises/${v.slug}/`;
  const heading = v.displayName ?? v.name;
  const askHref = `/cruises/${v.slug}/ask/`;
  const reserveHref = `/cruises/${v.slug}/reserve/`;
  const facet = v.type === "steam" ? undefined : TYPE_FACET[v.type];
  const hub = isBuilt(HUB[v.type]) ? HUB[v.type] : null;
  const its = v.itineraries;
  const ev = v.evaluation;
  const info = !v.bookable;
  // A vessel Nilecruz can't sell: no price, booking or offer request; an enquiry partner's address when there is one.
  const sold = sellsThroughUs(v.booking);
  const enquire =
    !sold && v.enquiry ? { href: `mailto:${v.enquiry.email}`, label: t("booking.enquire", { name: v.enquiry.name }) } : null;
  // ADR-109: the one public starting price (euros, operator-approved, in date), or "Price on request".
  const price = v.price;
  // "Includes our margin" only where the figure is confirmed to include it (6 Nov 2026).
  const priceText = (p: PublicPrice) =>
    p.mode === "from_price"
      ? tp.markup(p.margin !== false ? "from" : "fromGuide", { price: w.money(p.from), b: (c) => c })
      : p.mode === "price_band"
        ? tp.markup(p.margin !== false ? "band" : "bandGuide", { min: w.money(p.min), max: w.money(p.max), b: (c) => c })
        : tp("onRequest");
  const priceRich = (p: PublicPrice) =>
    !sold
      ? tp("unavailable")
      : p.mode === "from_price"
        ? tp.rich(p.margin !== false ? "from" : "fromGuide", { price: w.money(p.from), b: (c) => <b>{c}</b> })
        : p.mode === "price_band"
          ? tp.rich(p.margin !== false ? "band" : "bandGuide", { min: w.money(p.min), max: w.money(p.max), b: (c) => <b>{c}</b> })
          : tp("onRequest");
  const policy = !hasFigure(price) || price.margin !== false;
  const basis = hasFigure(price)
    ? price.basis === "per_person_per_night"
      ? tp("basisNight")
      : price.nights
        ? (() => {
            // The cruise the price is for, named by its route when exactly one itinerary has that length.
            const one = its.filter((i) => i.nights === price.nights);
            return one.length === 1
              ? tp("basisTripRoute", {
                  n: price.nights,
                  origin: w.place(one[0]!.origin),
                  destination: w.place(one[0]!.destination),
                })
              : tp("basisTripNights", { n: price.nights });
          })()
        : tp("basisTrip")
    : null;
  const cabins = v.cabins;
  const showCabins = cabins.length > 0 || !!v.deckPlan?.layout;
  const diets = DIETARY_OPTIONS.filter((o) => v.dietaryOptions?.includes(o.value)).map((o) => t(`onBoard.diet.${o.value}`));
  const onBoard = v.onBoard ?? [];
  const goodToKnow = v.goodToKnow ?? [];
  const metres = (n: number) => new Intl.NumberFormat(w.tag, { maximumFractionDigits: 1 }).format(n);
  const size = v.lengthM && v.beamM ? t("onBoard.sizeValue", { length: metres(v.lengthM), beam: metres(v.beamM) }) : null;
  const showOnBoard = !!(
    v.description ||
    v.dining ||
    diets.length ||
    v.mooring ||
    hub ||
    v.propulsionNote ||
    onBoard.length ||
    size
  );
  const inclusions = v.inclusions ?? { included: [], optional: [], notIncluded: [] };
  const lists = (
    [
      ["included", inclusions.included],
      ["optional", inclusions.optional],
      ["notIncluded", inclusions.notIncluded],
    ] as const
  ).filter(([, xs]) => xs.length);
  const anyDays = its.some((i) => i.days.length);
  const confirmed = its.some((i) => i.sailings.some((s) => s.status === "scheduled"));
  // The calendar draws usual weekdays without a period for the coming year, as expected dates.
  const calendarIts = withUsualYear(its, today);
  const linked = (text: string) => {
    const out: ReactNode[] = [];
    let last = 0;
    for (const m of text.matchAll(LINKED)) {
      out.push(text.slice(last, m.index));
      out.push(
        isBuilt(m[2]!) ? (
          <Link key={m.index} href={m[2]!}>
            {m[1]}
          </Link>
        ) : (
          m[1]
        ),
      );
      last = m.index + m[0].length;
    }
    out.push(text.slice(last));
    return out;
  };

  // "60, including 4 Royal Suites" when the types' counts add up; the most numerous type is the plain "cabins".
  const counted = cabins.filter((c) => c.count).sort((a, b) => b.count! - a.count!);
  const split = counted.length > 1 && counted.reduce((n, c) => n + c.count!, 0) === v.cabinCount ? counted : null;
  const named = (name: string, n: number) => (locale !== "ja" && n > 1 && !/s$/i.test(name) ? `${name}s` : name);
  const cabinsFact =
    v.cabinCount === null
      ? null
      : split
        ? t("hero.cabinsIncluding", {
            count: v.cabinCount,
            list: w.list(split.slice(1).map((c) => t("hero.cabinTypeCount", { n: c.count!, name: named(c.name, c.count!) }))),
          })
        : String(v.cabinCount);

  // The questions only this vessel's data can answer, and only the ones it can.
  const faqs: { q: string; a: string }[] = [];
  faqs.push({
    q: t("faq.costQ", { name: v.name }),
    a: !sold
      ? `${tp("unavailable")}. ${t("booking.costA")}`
      : hasFigure(price)
        ? [priceText(price), basis, policy ? tp("policy") : null].filter(Boolean).join(" ")
        : `${tp("onRequest")}. ${tp("onRequestNote")}`,
  });
  faqs.push({
    q: t("faq.bookQ"),
    a: !sold
      ? v.enquiry
        ? t("booking.bookA", { name: v.enquiry.name })
        : t("booking.bookNone")
      : v.bookable
        ? t("faq.bookYes")
        : t("faq.bookNo"),
  });
  if (its.length) {
    // "Four-night sailings leave Luxor for Aswan on Mondays, and three-night sailings leave Aswan …": longest first.
    const lines = [...its]
      .sort((a, b) => b.nights - a.nights)
      .map((i, n) =>
        t(n ? "faq.lengthLineMore" : "faq.lengthLine", {
          nights: i.nights,
          origin: w.place(i.origin),
          destination: w.place(i.destination),
          days: i.sailingDays.length ? t("faq.lengthDays", { days: w.days(i.sailingDays) }) : t("faq.lengthDated"),
        }),
      );
    const a = t("faq.lengthA", {
      lines: lines.length === 2 ? lines.join(t("faq.lengthAnd")) : w.list(lines),
    });
    faqs.push({ q: t("faq.lengthQ"), a: its.some((i) => i.sailingDays.length) ? `${a} ${t("faq.lengthPattern")}` : a });
  }
  if (v.cabinCount)
    faqs.push({
      q: t("faq.cabinsQ"),
      a: split
        ? t("faq.cabinsSplitA", {
            total: v.cabinCount,
            list: w.list([
              t("faq.cabinsMain", { n: split[0]!.count! }),
              ...split.slice(1).map((c) => t("faq.cabinsOther", { n: c.count!, name: named(c.name, c.count!) })),
            ]),
          })
        : t("faq.cabinsA", { total: v.cabinCount }),
    });
  if (diets.length)
    faqs.push({
      q: t("faq.dietsQ"),
      a: `${t("faq.dietsA", { list: w.list(diets) })} ${info ? t("onBoard.dietsAsk") : t("onBoard.dietsBook")}`,
    });

  const nav: NavItem[] = [
    { id: "price", label: t("nav.price") },
    ...(its.length ? [{ id: "itinerary", label: t("nav.itinerary") }] : []),
    ...(showCabins ? [{ id: "cabins", label: t("nav.cabins") }] : []),
    { id: "evaluation", label: t("nav.evaluation") },
    ...(showOnBoard ? [{ id: "on-board", label: t("nav.onBoard") }] : []),
    ...(goodToKnow.length ? [{ id: "good-to-know", label: t("nav.goodToKnow") }] : []),
    ...(its.length ? [{ id: "dates", label: t("nav.dates") }] : []),
    { id: "faqs", label: t("nav.faqs") },
  ];
  const howWeChoose = isBuilt("/how-we-choose-vessels/");

  return (
    <div className={styles.page}>
      <Breadcrumbs
        locale={locale}
        trail={[
          { name: t("crumbs.home"), path: "/" },
          { name: t("crumbs.cruises"), path: "/cruises/" },
          ...(facet
            ? [{ name: t(facet === "dahabiyas" ? "crumbs.dahabiyas" : "crumbs.motorShips"), path: `/cruises/${facet}/` }]
            : []),
          { name: heading, path },
        ]}
      />

      <header className={styles.hero}>
        <div className={styles.heroHead}>
          <p className={styles.eyebrow}>
            {t(`type.${v.type}`)}
            {v.sample ? ` · ${t("sampleData")}` : ""}
            {/* What drives it, from its data: an icon and a word, shown however sparse the rest is. */}
            {v.propulsion ? <Badge icon={propulsionIcon[v.propulsion]}>{td(`propulsion.${v.propulsion}`)}</Badge> : null}
          </p>
          <h1 className={styles.title}>{heading}</h1>
          {w.routeLine ? <p className={styles.route}>{w.routeLine}</p> : null}
        </div>
        {v.photos.length ? (
          <div className={styles.heroPhoto}>
            <VesselPhotos photos={v.photos} name={heading} hero />
          </div>
        ) : null}
        {/* The price on its own, so a phone shows it with the main action right under the photo. */}
        <dl className={styles.price}>
          <div className={styles.priceFact}>
            <dt>{sold ? t("hero.startingPrice") : t("booking.label")}</dt>
            <dd>{priceRich(price)}</dd>
          </div>
        </dl>
        <dl className={styles.facts} aria-label={t("hero.facts")}>
          {cabinsFact ? (
            <div>
              <dt>{t("hero.cabins")}</dt>
              <dd>{cabinsFact}</dd>
            </div>
          ) : null}
          {v.deckCount ? (
            <div>
              <dt>{t("hero.decks")}</dt>
              <dd>{v.deckCount}</dd>
            </div>
          ) : null}
          {w.sailings ? (
            <div className={styles.wide}>
              <dt>{t("hero.sailings")}</dt>
              <dd>{w.sailings}</dd>
            </div>
          ) : null}
          {v.maxGuests ? (
            <div>
              <dt>{t("hero.guests")}</dt>
              <dd>{v.maxGuests}</dd>
            </div>
          ) : null}
          {v.yearBuilt ? (
            <div>
              <dt>{t("hero.built")}</dt>
              <dd>{v.yearBuilt}</dd>
            </div>
          ) : null}
          {v.yearRenovated ? (
            <div>
              <dt>{t("hero.renovated")}</dt>
              <dd>{v.yearRenovated}</dd>
            </div>
          ) : null}
          {ev ? (
            <div>
              <dt>{t("hero.score")}</dt>
              <dd>{t("hero.scoreValue", { score: Math.round(ev.score) })}</dd>
            </div>
          ) : null}
        </dl>
        <div className={styles.actions}>
          <div className={styles.buttons}>
            {enquire ? (
              <a className={styles.primary} href={enquire.href}>
                {enquire.label}
              </a>
            ) : sold ? (
              <Link className={styles.primary} href={v.bookable ? reserveHref : askHref}>
                {v.bookable ? t("hero.seePrices") : t("hero.ask")}
              </Link>
            ) : null}
            <a className={styles.secondary} href="#price">
              {t("hero.seeIncluded")}
            </a>
            <AddToCompare vessel={{ slug: v.slug, name: v.name }} />
          </div>
          <p className={styles.status}>{!sold ? t("booking.note") : v.bookable ? t("hero.bookableNote") : t("hero.infoOnly")}</p>
        </div>
        {v.summary ? <p className={styles.lead}>{v.summary}</p> : null}
      </header>

      {v.goodFor || v.lessSuitedTo ? (
        <section className={styles.verdict} aria-labelledby="verdict">
          <h2 id="verdict">{t("verdict.title")}</h2>
          <dl>
            {v.goodFor ? (
              <div>
                <dt>{t("verdict.goodFor")}</dt>
                <dd>{v.goodFor}</dd>
              </div>
            ) : null}
            {v.lessSuitedTo ? (
              <div>
                <dt>{t("verdict.lessSuited")}</dt>
                <dd>{linked(v.lessSuitedTo)}</dd>
              </div>
            ) : null}
            {ev?.verdictSummary ? (
              <div>
                <dt>{t("verdict.ourView")}</dt>
                <dd>{ev.verdictSummary}</dd>
              </div>
            ) : null}
          </dl>
        </section>
      ) : null}

      <SectionNav
        items={nav}
        label={t("nav.label")}
        action={
          !sold
            ? (enquire ?? undefined)
            : { href: v.bookable ? reserveHref : askHref, label: v.bookable ? t("hero.seePrices") : t("hero.ask") }
        }
      />

      <section className={styles.section} id="price" aria-labelledby="price-h">
        <h2 id="price-h">{t("price.title")}</h2>
        <p className={styles.big}>{priceRich(price)}</p>
        {!sold ? (
          <>
            <p>{t("booking.note")}</p>
            {enquire ? (
              <p className={styles.buttons}>
                <a className={styles.primary} href={enquire.href}>
                  {enquire.label}
                </a>
              </p>
            ) : null}
          </>
        ) : (
          <>
            {hasFigure(price) ? (
              <p className={styles.muted}>
                {basis} {tp("checked", { date: formatDate(price.lastChecked, locale) })}
              </p>
            ) : (
              <p>{tp("onRequestNote")}</p>
            )}
            <p>{t(v.bookable ? "price.shapesBookable" : "price.shapes")}</p>
            {policy ? <p>{tp("policy")}</p> : null}
          </>
        )}
        {sold ? <p>{tp("gratuities")}</p> : null}
        {isBuilt("/nile-cruise-prices/") ? (
          <p>
            <Link href="/nile-cruise-prices/">{tp("why")}</Link>
          </p>
        ) : null}
        {lists.length ? (
          <div className={styles.lists}>
            {lists.map(([k, xs]) => (
              <div key={k}>
                <h3>{t(`price.${k}`)}</h3>
                <ul>
                  {xs.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.callout}>
            {/* DATA-018, SEO-013: transfers are sold separately, on their own page. */}
            {t.rich("price.fallback", {
              link: (c) => (isBuilt("/tours-extras/transfers/") ? <Link href="/tours-extras/transfers/">{c}</Link> : c),
            })}
            {anyDays && sold ? ` ${t("price.fallbackProgramme")}` : ""}
          </p>
        )}
        {rates && sold ? (
          <RatesForm
            action={rates}
            locale={locale}
            slug={v.slug}
            defaultItinerary={[...its].sort((a, b) => a.nights - b.nights || a.code.localeCompare(b.code))[0]?.code}
            itineraries={its.map((i) => ({
              value: i.code,
              label: t("ask.cruiseOption", {
                nights: formatNights(i.nights, locale),
                origin: w.place(i.origin),
                destination: w.place(i.destination),
              }),
            }))}
            cabins={cabins.map((c) => ({ value: c.id, label: c.name }))}
          />
        ) : null}
        {sold ? (
          <p>
            <Link className={styles.secondary} href={askHref}>
              {t("price.askIncluded")}
            </Link>
          </p>
        ) : null}
      </section>

      {its.length ? (
        <section className={styles.section} id="itinerary" aria-labelledby="itinerary-h">
          <h2 id="itinerary-h">{t("itinerary.title")}</h2>
          <ItinerarySwitch
            defaultCode={[...its].sort((a, b) => a.nights - b.nights || a.code.localeCompare(b.code))[0]!.code}
            label={t("itinerary.choose")}
            panels={[...its]
              .sort((a, b) => a.nights - b.nights || a.code.localeCompare(b.code))
              .map((i) => ({
                code: i.code,
                nights: formatNights(i.nights, locale),
                route: `${w.place(i.origin)} → ${w.place(i.destination)}`,
                when: !i.sailingDays.length
                  ? t("itinerary.onDates")
                  : i.sailingDays.length === 7
                    ? t("itinerary.everyDay")
                    : i.sailingDays.length < 3
                      ? w.days(i.sailingDays).replace(/^./, (c) => c.toUpperCase())
                      : t("itinerary.daysAWeek", { n: i.sailingDays.length }),
                heading: headingOf(i.origin, i.destination),
                node: <ItineraryDetails v={v} it={i} locale={locale} place={w.place} />,
              }))}
          />
        </section>
      ) : null}

      {showCabins ? (
        <section className={styles.section} id="cabins" aria-labelledby="cabins-h">
          <h2 id="cabins-h">{t("cabins.title")}</h2>
          <CabinsAndDecks
            cabins={cabins}
            layout={v.deckPlan?.layout ?? null}
            original={v.deckPlan?.original ?? null}
            maxGuests={v.maxGuests}
            sharedSpaces={v.sharedSpaces}
          />
        </section>
      ) : null}

      <section className={styles.section} id="evaluation" aria-labelledby="evaluation-h">
        <h2 id="evaluation-h">{t("evaluation.title")}</h2>
        {ev ? (
          <>
            <p className={styles.score}>
              <strong>{t("evaluation.score", { score: Math.round(ev.score) })}</strong> · {t(`evaluation.verdict.${ev.verdict}`)}
            </p>
            {ev.verdictSummary ? <p className={styles.big}>{ev.verdictSummary}</p> : null}
            <p className={styles.muted}>
              {t("evaluation.by", {
                date: formatDay(ev.assessedOn, w.tag),
                name: ev.evaluator,
                role: ev.evaluatorRole ?? "",
                method: ev.method ? t(`evaluation.method.${ev.method}`) : "",
              })}
            </p>
            <div className={styles.lists}>
              <div>
                <h3>{t("evaluation.strengths")}</h3>
                <ul>
                  {ev.strengths.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3>{t("evaluation.watchPoints")}</h3>
                <ul>
                  {ev.watchPoints.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
            </div>
            <h3>{t("evaluation.dimensions")}</h3>
            <dl className={styles.dimensions}>
              {DIMENSIONS.map((d) => {
                const points = ev.dimensions[d.key] ?? 0;
                const label = t(`evaluation.dimension.${d.key}`);
                const of = t("evaluation.points", { points: points.toFixed(1), weight: d.weight });
                return (
                  <div key={d.key}>
                    <dt>{label}</dt>
                    <dd>
                      <meter min={0} max={d.weight} value={points} aria-label={`${label}: ${of}`} />
                      <span>{of}</span>
                    </dd>
                    {ev.dimensionNotes[d.key] ? <dd className={styles.dimensionNote}>{ev.dimensionNotes[d.key]}</dd> : null}
                  </div>
                );
              })}
            </dl>
            <EvaluationRadar
              score={ev.score}
              axes={DIMENSIONS.map((d) => ({
                key: d.key,
                label: t(`evaluation.dimension.${d.key}`),
                weight: d.weight,
                points: ev.dimensions[d.key] ?? 0,
              }))}
            />
          </>
        ) : (
          <p>
            {t.rich("evaluation.notYet", {
              link: (c) => (howWeChoose ? <Link href="/how-we-choose-vessels/">{c}</Link> : null),
            })}
          </p>
        )}
        <p className={styles.trust}>
          {t.rich("evaluation.trust", {
            link: (c) => (howWeChoose ? <Link href="/how-we-choose-vessels/">{c}</Link> : null),
          })}
        </p>
        {v.externalRatings.length ? (
          <div className={styles.sub} id="ratings">
            <h3>{t("evaluation.ratings")}</h3>
            <p className={styles.muted}>{t("evaluation.ratingsNote")}</p>
            <ul>
              {v.externalRatings.map((r) => (
                <li key={`${r.source}-${r.retrievedOn}`}>
                  <strong>{t("evaluation.rating", { rating: r.rating, scale: r.scale })}</strong> {t("evaluation.ratingOn")}{" "}
                  {r.url ? (
                    <a href={r.url} rel="nofollow noopener" target="_blank">
                      {r.source}
                    </a>
                  ) : (
                    r.source
                  )}
                  {r.count !== null ? `, ${t("evaluation.reviews", { n: r.count })}` : ""} ·{" "}
                  {t("evaluation.checked", { date: formatDay(r.retrievedOn, w.tag) })}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      {showOnBoard ? (
        <section className={styles.section} id="on-board" aria-labelledby="on-board-h">
          <h2 id="on-board-h">{t("onBoard.title")}</h2>
          {v.description ? <p className={styles.prose}>{v.description}</p> : null}
          {v.propulsionNote ? (
            <div className={styles.sub} id="sailing">
              <h3>{t("onBoard.sails")}</h3>
              <p>{v.propulsionNote}</p>
            </div>
          ) : null}
          {onBoard.length || size ? (
            <div className={styles.sub} id="facilities">
              <h3>{t("onBoard.notes")}</h3>
              <ul>
                {size ? <li>{t("onBoard.size", { size })}</li> : null}
                {onBoard.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {v.dining || diets.length ? (
            <div className={styles.sub} id="dining">
              <h3>{t("onBoard.food")}</h3>
              <p>
                {[
                  v.dining,
                  diets.length ? t("onBoard.diets", { list: w.list(diets) }) : null,
                  diets.length ? (info ? t("onBoard.dietsAsk") : t("onBoard.dietsBook")) : null,
                ]
                  .filter(Boolean)
                  .join(" ")}
              </p>
            </div>
          ) : null}
          {v.mooring ? (
            <div className={styles.sub} id="mooring">
              <h3>{t("onBoard.mooring")}</h3>
              <MooringExplainer practice={v.mooring} />
            </div>
          ) : null}
          {hub ? (
            <p>
              {/* SEO-013: every vessel page links to its vessel-type hub. */}
              <Link href={hub}>{t(`onBoard.guide.${v.type}`)}</Link>
            </p>
          ) : null}
        </section>
      ) : null}

      {goodToKnow.length ? (
        <section className={styles.section} id="good-to-know" aria-labelledby="good-to-know-h">
          <h2 id="good-to-know-h">{t("goodToKnow.title")}</h2>
          <ul>
            {goodToKnow.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {its.length ? (
        <section className={styles.section} id="dates" aria-labelledby="dates-h">
          {/* The sailing dates of every itinerary on one calendar: departure rows and the weekly pattern. */}
          <h2 id="dates-h">{tc("title")}</h2>
          <p>
            {!sold
              ? t("booking.datesIntro")
              : confirmed
                ? t("dates.introConfirmed")
                : calendarSailings(calendarIts, today).length
                  ? t("dates.intro")
                  : t("dates.introUsual")}
          </p>
          {!confirmed && sold ? <p className={styles.callout}>{t("dates.noneConfirmed")}</p> : null}
          <SailingCalendar
            // Direction is worked out on the English names; the visitor reads the places in their language.
            sailings={calendarSailings(calendarIts, today).map((s) => ({
              ...s,
              origin: w.place(s.origin),
              destination: w.place(s.destination),
            }))}
            patterns={patternLines(calendarIts, today).map((p) => ({
              ...p,
              origin: w.place(p.origin),
              destination: w.place(p.destination),
            }))}
            usual={usualLines(calendarIts, today).map((p) => ({
              ...p,
              origin: w.place(p.origin),
              destination: w.place(p.destination),
            }))}
            today={today}
            bookable={v.bookable}
            reserve={reserveHref}
            ask={sold ? askHref : undefined}
          />
        </section>
      ) : null}

      <section className={styles.section} id="faqs" aria-labelledby="faqs-h">
        <h2 id="faqs-h">{t("faq.title", { name: v.name })}</h2>
        <dl className={styles.faqs}>
          {faqs.map((f) => (
            <div key={f.q}>
              <dt>{f.q}</dt>
              <dd>{f.a}</dd>
            </div>
          ))}
        </dl>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLdScript({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
            }),
          }}
        />
      </section>

      {similar.length ? (
        <section className={styles.section} aria-labelledby="similar-h">
          <h2 id="similar-h">{t("similar.title")}</h2>
          <ul className={styles.similar}>
            {similar.map((s) => (
              <li key={s.slug}>
                <Media image={s.image} vessel={s.type} sizes="(min-width: 900px) 30vw, 100vw" className={styles.similarPhoto} />
                <h3>
                  <Link href={`/cruises/${s.slug}/`}>{s.displayName ?? s.name}</Link>
                </h3>
                {s.propulsion ? (
                  <p>
                    <Badge icon={propulsionIcon[s.propulsion]}>{td(`propulsion.${s.propulsion}`)}</Badge>
                  </p>
                ) : null}
                <p className={styles.muted}>
                  {[
                    s.cabinCount ? t("similar.cabins", { n: s.cabinCount }) : null,
                    !sellsThroughUs(s.booking) ? tp("unavailable") : hasFigure(s.price) ? priceText(s.price) : tp("onRequest"),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {s.bookable ? <p className={styles.badge}>{t("similar.bookable")}</p> : null}
              </li>
            ))}
          </ul>
          {isBuilt("/vessels/compare/") ? (
            <p>
              <Link href="/vessels/compare/">{t("similar.compareTypes")}</Link>
            </p>
          ) : null}
        </section>
      ) : null}

      <section className={styles.final} aria-labelledby="final-h">
        <h2 id="final-h">{sold ? t("final.title") : t("booking.finalTitle")}</h2>
        <p>{sold ? t("final.text") : t("booking.note")}</p>
        <p className={styles.buttons}>
          {enquire ? (
            <a className={styles.primary} href={enquire.href}>
              {enquire.label}
            </a>
          ) : sold ? (
            <Link className={styles.primary} href={askHref}>
              {t("hero.ask")}
            </Link>
          ) : null}
          {isBuilt("/plan-my-cruise/") ? (
            <Link className={styles.secondary} href="/plan-my-cruise/">
              {t("final.plan")}
            </Link>
          ) : null}
        </p>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            touristTripJsonLd(v, absoluteUrl(locale, path), {
              name: v.name,
              description: v.summary,
              image: ogImage,
              trip: w.trip,
            }),
          ),
        }}
      />
      <CompareTray />
    </div>
  );
}

/** One itinerary: check-in to check-out (DATA-018), the sailing time (PROPOSED-019) and the days. */
function ItineraryDetails({
  v,
  it,
  locale,
  place,
}: {
  v: VesselPage;
  it: VesselItinerary;
  locale: Locale;
  place: (name: string) => string;
}) {
  const t = useTranslations("vesselPage");
  const heading = headingOf(it.origin, it.destination);
  const stops = stopsFor(it.origin, it.destination).filter((st) => isBuilt(st.href));
  const origin = place(it.origin);
  const destination = place(it.destination);
  const nights = formatNights(it.nights, locale);
  return (
    <div className={styles.itinerary}>
      <p>{t("itinerary.checkInOut", { origin, destination, last: it.nights + 1 })}</p>
      {it.boardingNote ? (
        <p>
          <strong>{t("itinerary.boarding")}</strong> {it.boardingNote}
        </p>
      ) : null}
      {it.sightseeing ? (
        <p>
          <strong>{t("itinerary.vesselSightseeing")}</strong>{" "}
          {[
            it.sightseeing.guide ? t("itinerary.guide") : null,
            it.sightseeing.ticketsIncluded ? t("itinerary.fees") : t("itinerary.noFees"),
            t("itinerary.visiting", { sites: it.sightseeing.sites.join(", ") }),
          ]
            .filter(Boolean)
            .join("; ")
            .replace(/^./, (c) => c.toUpperCase())}
          .{it.sightseeing.note ? ` ${it.sightseeing.note}` : ""}
        </p>
      ) : it.programme ? (
        <p>
          {/* ADR-102: Nilecruz's programme, its own booking with Nilecruz, paid together with the cruise. */}
          {/* ADR-109: the programme's rate is in US dollars, so no price is shown (never converted). */}
          {t.rich("itinerary.programmeOnRequest", {
            name: it.programme.name,
            link: (c) => <Link href={`/tours-extras/${it.programme!.slug}/`}>{c}</Link>,
          })}
        </p>
      ) : null}
      {stops.length ? (
        <p>
          {/* SEO-013: the destinations this itinerary stops at. */}
          {t("itinerary.stops")}{" "}
          {stops.map((st, i) => (
            <span key={st.href}>
              {i ? " · " : ""}
              <Link href={st.href}>{place(st.name)}</Link>
            </span>
          ))}
        </p>
      ) : null}
      {it.sailingPeriod ? (
        <p>
          {t("itinerary.sails", {
            origin,
            when: it.sailsAt
              ? t("itinerary.whenAt", { when: t(`itinerary.when.${it.sailingPeriod}`), time: it.sailsAt.slice(0, 5) })
              : t(`itinerary.when.${it.sailingPeriod}`),
          })}
        </p>
      ) : null}
      {arriveDayBefore(it.sailingPeriod) ? <p className={styles.muted}>{t("itinerary.dayBefore", { origin })}</p> : null}
      {it.days.length ? (
        <p className={styles.direction}>
          {heading ? (
            <span className={styles[heading]}>
              <span aria-hidden="true">{heading === "south" ? "↓" : "↑"}</span>{" "}
              {heading === "south" ? t("itinerary.south") : t("itinerary.north")}
            </span>
          ) : null}
          <span>
            <span aria-hidden="true">☾</span> {t("itinerary.onBoard", { nights })}
          </span>
        </p>
      ) : null}
      {it.days.length ? (
        <ItineraryTimeline
          scroll
          nights
          // The route's drawing matches what drives the vessel: a ship, a sail or a paddle steamer.
          vessel={v.propulsion ? propulsionArt[v.propulsion] : v.type}
          stops={it.days.map((d) => ({
            day: d.day,
            place: d.day === 1 ? origin : d.day === it.nights + 1 ? destination : "",
            title: d.title,
            body: d.body,
          }))}
        />
      ) : (
        <p className={styles.muted}>{t("itinerary.noDays")}</p>
      )}
      {it.departures.length ? (
        <p>
          <a href="#dates">{t("itinerary.seeDates")}</a>
        </p>
      ) : null}
    </div>
  );
}
