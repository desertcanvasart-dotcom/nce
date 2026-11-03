import { useTranslations } from "next-intl";
import { ItineraryTimeline } from "@/components/ds/ItineraryTimeline/ItineraryTimeline";
import { formatMoney } from "@/components/ds/lib/format";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { EvaluationRadar } from "@/components/evaluation/EvaluationRadar";
import { DIMENSIONS } from "@/lib/evaluation/method";
import { jsonLdScript } from "@/lib/marketplace/listing";
import {
  formatDay,
  stopsFor,
  touristTripJsonLd,
  VERDICT_TEXT,
  vesselH1,
  sightseeingText,
  type VesselItinerary,
  type VesselPage,
} from "@/lib/marketplace/vessel";
import { WEEKDAYS } from "@/lib/product/departures";
import { arriveDayBefore, dayBeforeTip, sailingTimeText } from "@/lib/product/sailing-time";
import { isBuilt, keywordText, LINK_MAP } from "@/lib/seo/links";
import { absoluteUrl } from "@/lib/seo/metadata";
import { calendarSailings, headingOf, patternLines } from "@/lib/marketplace/sailing-calendar";
import { Breadcrumbs } from "./Breadcrumbs";
import { MooringExplainer } from "@/components/mooring/MooringExplainer";
import { dietaryText } from "@/lib/catalogue/dining";
import { DeckPlan } from "./DeckPlan";
import { VesselPhotos } from "./VesselPhotos";
import { ItinerarySwitch } from "./ItinerarySwitch";
import { AddToCompare, CompareTray } from "./CompareTray";
import { PriceWhy } from "./PriceWhy";
import { SailingCalendar } from "./SailingCalendar";
import styles from "./marketplace.module.css";

const TYPE = { sail: "Sailing dahabiya", motor: "Motor cruise ship", steam: "Paddle steamer" } as const;
const TYPE_FACET = {
  sail: { slug: "dahabiyas", name: "Dahabiya cruises" },
  motor: { slug: "motor-ships", name: "Nile cruise ships" },
} as const;

/** PAGE-072: one page per vessel with all its itineraries (DATA-031), cabins by deck, evaluation and external ratings. */
/** "Mondays", "Mondays and Fridays", or "On published dates" for an itinerary without a weekly day. */
const sailsOn = (days: number[]) => {
  const names = WEEKDAYS.filter((w) => days.includes(w.value)).map((w) => `${w.label}s`);
  if (!names.length) return "On published dates";
  return names.length === 7 ? "Every day" : names.length < 3 ? names.join(" and ") : `${names.length} days a week`;
};

export function VesselView({
  locale,
  v,
  it,
  today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" }),
}: {
  locale: Locale;
  v: VesselPage;
  it: VesselItinerary | undefined;
  /** Today in Cairo; injectable for tests. */
  today?: string;
}) {
  const t = useTranslations("sailingCalendar");
  const path = `/cruises/${v.slug}/`;
  const facet = v.type === "steam" ? undefined : TYPE_FACET[v.type];
  const hubUrl = { sail: "/vessels/dahabiya/", motor: "/vessels/motor-cruise-ships/", steam: "/vessels/paddle-steamers/" }[
    v.type
  ];
  const typeHub = isBuilt(hubUrl) ? { href: hubUrl, anchor: keywordText(LINK_MAP[hubUrl]!.keyword) } : null;
  const reserve = `/cruises/${v.slug}/reserve/${it ? `?itinerary=${encodeURIComponent(it.code)}` : ""}`;
  const ask = `/dashboard/journey/requests/?${new URLSearchParams({
    ...(it ? { route: `${it.origin}→${it.destination}`, nights: String(it.nights) } : {}),
    ...(it?.departures[0] ? { from: it.departures[0] } : {}),
  }).toString()}#new`;
  return (
    <div className={styles.page}>
      <Breadcrumbs
        locale={locale}
        trail={[
          { name: "Home", path: "/" },
          { name: "Cruises", path: "/cruises/" },
          ...(facet ? [{ name: facet.name, path: `/cruises/${facet.slug}/` }] : []),
          { name: v.name, path },
        ]}
      />
      <header className={styles.head}>
        <p className={styles.eyebrow}>
          {TYPE[v.type]}
          {v.sample ? " · Sample data" : ""}
        </p>
        <h1 className={styles.title}>{vesselH1(v.name, it)}</h1>
        {v.summary ? <p className={styles.lead}>{v.summary}</p> : null}
        {typeHub ? (
          <p className={styles.note}>
            {/* SEO-013: every vessel page links to its vessel-type hub, by the hub's keyword. */}
            What it’s like on board: our guide to the <Link href={typeHub.href}>{typeHub.anchor}</Link>.
          </p>
        ) : null}
      </header>

      <dl className={styles.facts}>
        <div>
          <dt>Guests on board, at most</dt>
          <dd>{v.maxGuests ?? "Not given"}</dd>
        </div>
        <div>
          <dt>Cabins</dt>
          <dd>{v.cabinCount ?? "Not given"}</dd>
        </div>
        <div>
          <dt>Decks</dt>
          <dd>{v.deckCount ?? "Not given"}</dd>
        </div>
        {v.yearBuilt ? (
          <div>
            <dt>Built</dt>
            <dd>{v.yearBuilt}</dd>
          </div>
        ) : null}
        <div>
          <dt>Nilecruz evaluation</dt>
          <dd>{v.evaluation ? `${Math.round(v.evaluation.score)}/100` : "Not evaluated yet"}</dd>
        </div>
        <div>
          <dt>From, per person</dt>
          <dd>
            <span>
              {v.bookable && v.from ? formatMoney(v.from, locale) : v.bookable ? "Prices on request" : "Information only"}
            </span>
            {v.bookable && v.from ? (
              <>
                {" "}
                <PriceWhy
                  facts={{
                    price: v.from,
                    vesselType: v.type,
                    maxGuests: v.maxGuests,
                    nights: it?.nights,
                    nextDeparture: it?.departures[0],
                    gratuityUsdMinor: v.gratuityUsdMinor,
                    sightseeing: v.fromWithSightseeing
                      ? { by: v.sightseeingBy ?? "vessel", from: v.fromWithSightseeing }
                      : undefined,
                  }}
                />
              </>
            ) : null}
          </dd>
        </div>
        {v.bookable && v.fromWithSightseeing ? (
          <div>
            <dt>With sightseeing, from</dt>
            <dd>{formatMoney(v.fromWithSightseeing, locale)}</dd>
          </div>
        ) : null}
      </dl>

      <section className={styles.cta} aria-label="Prices and booking">
        <AddToCompare vessel={{ slug: v.slug, name: v.name }} />
        {v.bookable ? (
          <>
            <Link className={styles.primary} href={reserve}>
              See prices and dates
            </Link>
            <p className={styles.note}>
              Sign in to see every cabin’s price for every departure, and reserve. The “from” price is per person for two sharing
              the lowest-priced cabin with places left.
              {v.gratuityUsdMinor
                ? ` Crew gratuities of ${formatMoney({ amount: v.gratuityUsdMinor, currency: "USD" }, locale)} per person per night are separate, paid on board at check-out.`
                : ""}
            </p>
          </>
        ) : (
          <>
            <p className={styles.note}>
              <strong>Information only.</strong> This vessel can’t be booked on Nilecruz right now: no prices or availability are
              shown. Ask operators for an offer instead.
            </p>
            <Link className={styles.secondary} href={ask}>
              Ask for an offer
            </Link>
          </>
        )}
      </section>

      {v.photos.length ? <VesselPhotos photos={v.photos} name={v.name} /> : null}

      {v.description ? (
        <section className={styles.section}>
          <h2>About {v.name}</h2>
          <p className={styles.prose}>{v.description}</p>
        </section>
      ) : null}

      {v.dining || v.dietaryOptions?.length ? (
        <section className={styles.section} id="dining">
          <h2>Food and dining</h2>
          {v.dining ? <p className={styles.prose}>{v.dining}</p> : null}
          {dietaryText(v.dietaryOptions ?? []) ? <p className={styles.note}>{dietaryText(v.dietaryOptions ?? [])}</p> : null}
        </section>
      ) : null}

      <section className={styles.section} id="itinerary">
        <h2>Itinerary</h2>
        {it ? (
          <ItinerarySwitch
            defaultCode={it.code}
            panels={v.itineraries.map((i) => ({
              code: i.code,
              nights: i.nights,
              route: `${i.origin} → ${i.destination}`,
              when: sailsOn(i.sailingDays),
              heading: headingOf(i.origin, i.destination),
              node: <ItineraryDetails v={v} it={i} locale={locale} />,
            }))}
          />
        ) : (
          <p className={styles.note}>No itinerary is published for this vessel yet.</p>
        )}
      </section>

      {v.itineraries.length ? (
        <section className={styles.section} id="dates">
          {/* The sailing dates of every itinerary on one calendar: departure rows and the weekly pattern. */}
          <h2>{t("title")}</h2>
          <p className={styles.note}>{t("lead")}</p>
          <SailingCalendar
            sailings={calendarSailings(v.itineraries, today)}
            patterns={patternLines(v.itineraries, today)}
            today={today}
            bookable={v.bookable}
            reserve={`/cruises/${v.slug}/reserve/`}
          />
        </section>
      ) : null}

      <section className={styles.section} id="cabins">
        <h2>Cabins and decks</h2>
        <DeckPlan cabins={v.cabins} maxGuests={v.maxGuests} sharedSpaces={v.sharedSpaces} plan={v.deckPlan} />
      </section>

      {v.mooring ? (
        <section className={styles.section} id="mooring">
          <h2>Where it moors</h2>
          <MooringExplainer practice={v.mooring} />
        </section>
      ) : null}

      <section className={styles.section} id="evaluation">
        <h2>Nilecruz evaluation</h2>
        {v.evaluation ? (
          <>
            <p className={styles.score}>
              <strong>{Math.round(v.evaluation.score)}/100</strong> · {VERDICT_TEXT[v.evaluation.verdict]}
            </p>
            <p className={styles.note}>
              Assessed on {formatDay(v.evaluation.assessedOn, locale)} by {v.evaluation.evaluator}, against seven weighted
              dimensions.
            </p>
            <EvaluationRadar
              score={v.evaluation.score}
              axes={DIMENSIONS.map((d) => ({
                key: d.key,
                label: d.label,
                weight: d.weight,
                points: v.evaluation!.dimensions[d.key] ?? 0,
              }))}
            />
            <dl className={styles.dimensions}>
              {DIMENSIONS.map((d) => {
                const points = v.evaluation!.dimensions[d.key] ?? 0;
                return (
                  <div key={d.key}>
                    <dt>{d.label}</dt>
                    <dd>
                      <meter
                        min={0}
                        max={d.weight}
                        value={points}
                        aria-label={`${d.label}: ${points.toFixed(1)} of ${d.weight}`}
                      />
                      <span>
                        {points.toFixed(1)} of {d.weight}
                      </span>
                    </dd>
                  </div>
                );
              })}
            </dl>
          </>
        ) : (
          <p className={styles.note}>Nilecruz hasn’t published an evaluation of this vessel yet.</p>
        )}
      </section>

      {v.externalRatings.length ? (
        <section className={styles.section} id="ratings">
          <h2>Ratings elsewhere</h2>
          <p className={styles.note}>Ratings from other sites, as they stood on the date shown. They aren’t Nilecruz reviews.</p>
          <ul className={styles.list}>
            {v.externalRatings.map((r) => (
              <li key={`${r.source}-${r.retrievedOn}`}>
                <strong>
                  {r.rating} of {r.scale}
                </strong>{" "}
                on{" "}
                {r.url ? (
                  <a href={r.url} rel="nofollow noopener" target="_blank">
                    {r.source}
                  </a>
                ) : (
                  r.source
                )}
                {r.count !== null ? `, ${r.count} reviews` : ""} · checked {formatDay(r.retrievedOn, locale)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(touristTripJsonLd(v, it, absoluteUrl(locale, path))) }}
      />
      <CompareTray />
    </div>
  );
}

/** One itinerary: check-in to check-out (DATA-018), the sailing time (PROPOSED-019), the days and the next departures. */
function ItineraryDetails({ v, it, locale }: { v: VesselPage; it: VesselItinerary; locale: Locale }) {
  const sails = sailingTimeText(it.sailingPeriod, it.sailsAt, it.origin);
  const heading = headingOf(it.origin, it.destination);
  const stops = stopsFor(it.origin, it.destination).filter((st) => isBuilt(st.href));
  return (
    <div className={styles.section}>
      <p>
        From check-in on day 1 in {it.origin} to check-out on day {it.nights + 1} in {it.destination}.{" "}
        {/* DATA-018: transfers are separate, and sold on their own page. */}
        {isBuilt("/tours-extras/transfers/") ? (
          <>
            <Link href="/tours-extras/transfers/">Airport and hotel transfers</Link>, flights and tours aren’t included; they are
            booked separately.
          </>
        ) : (
          "Airport and hotel transfers, flights and tours aren’t included; they are booked separately."
        )}
      </p>
      {it.sightseeing ? (
        <p>
          <strong>Also sold with the vessel’s own sightseeing:</strong> {sightseeingText(it.sightseeing)}
          {it.sightseeing.note ? ` ${it.sightseeing.note}` : ""}
        </p>
      ) : it.programme ? (
        <p>
          {/* ADR-102: Nilecruz's programme, its own booking with Nilecruz, paid together with the cruise. */}
          <strong>With sightseeing:</strong> add Nilecruz’s{" "}
          <Link href={`/tours-extras/${it.programme.slug}/`}>{it.programme.name}</Link> when you book, from{" "}
          {formatMoney({ amount: it.programme.ppForTwoMinor, currency: "USD" }, locale)} per person for two. It’s a separate
          booking with Nilecruz, with an Egyptologist guide and entrance fees, paid together with your cruise.
        </p>
      ) : null}
      {stops.length ? (
        <p>
          {/* SEO-013: the destinations this itinerary stops at. */}
          Stops:{" "}
          {stops.map((st, i) => (
            <span key={st.href}>
              {i ? " · " : ""}
              <Link href={st.href}>{st.name}</Link>
            </span>
          ))}
        </p>
      ) : null}
      {sails ? <p>{sails}.</p> : null}
      {arriveDayBefore(it.sailingPeriod) ? <p className={styles.note}>{dayBeforeTip(it.origin)}</p> : null}
      {it.days.length ? (
        <p className={styles.direction}>
          {heading ? (
            <span className={styles[heading]}>
              <span aria-hidden="true">{heading === "south" ? "↓" : "↑"}</span>{" "}
              {heading === "south" ? "Upstream, sailing south" : "Downstream, sailing north"}
            </span>
          ) : null}
          <span>
            <span aria-hidden="true">☾</span> {it.nights} {it.nights === 1 ? "night" : "nights"} on board
          </span>
        </p>
      ) : null}
      {it.days.length ? (
        <ItineraryTimeline
          scroll
          nights
          vessel={v.type}
          stops={it.days.map((d) => ({
            day: d.day,
            place: d.day === 1 ? it.origin : d.day === it.nights + 1 ? it.destination : "",
            title: d.title,
            body: d.body,
          }))}
        />
      ) : (
        <p className={styles.note}>The operator hasn’t published the day-by-day programme yet.</p>
      )}
      {it.departures.length ? (
        <p>
          <a href="#dates">See this itinerary’s sailing dates on the calendar</a>.
        </p>
      ) : null}
    </div>
  );
}
