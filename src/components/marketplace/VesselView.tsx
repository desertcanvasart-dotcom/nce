import { Gallery } from "@/components/ds/Gallery/Gallery";
import { ItineraryTimeline } from "@/components/ds/ItineraryTimeline/ItineraryTimeline";
import { formatMoney } from "@/components/ds/lib/format";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { DIMENSIONS } from "@/lib/evaluation/method";
import { jsonLdScript } from "@/lib/marketplace/listing";
import {
  formatDay,
  stopsFor,
  touristTripJsonLd,
  VERDICT_TEXT,
  vesselH1,
  type VesselItinerary,
  type VesselPage,
} from "@/lib/marketplace/vessel";
import { arriveDayBefore, dayBeforeTip, sailingTimeText } from "@/lib/product/sailing-time";
import { isBuilt, keywordText, LINK_MAP } from "@/lib/seo/links";
import { absoluteUrl } from "@/lib/seo/metadata";
import { Breadcrumbs } from "./Breadcrumbs";
import { DeckPlan } from "./DeckPlan";
import { ItinerarySwitch } from "./ItinerarySwitch";
import styles from "./marketplace.module.css";

const TYPE = { sail: "Sailing dahabiya", motor: "Motor cruise ship", steam: "Paddle steamer" } as const;
const TYPE_FACET = {
  sail: { slug: "dahabiyas", name: "Dahabiya cruises" },
  motor: { slug: "motor-ships", name: "Nile cruise ships" },
} as const;

/** PAGE-072: one page per vessel with all its itineraries (DATA-031), cabins by deck, evaluation and external ratings. */
export function VesselView({ locale, v, it }: { locale: Locale; v: VesselPage; it: VesselItinerary | undefined }) {
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
          <dd>{v.bookable && v.from ? formatMoney(v.from, locale) : v.bookable ? "Prices on request" : "Information only"}</dd>
        </div>
      </dl>

      <section className={styles.cta} aria-label="Prices and booking">
        {v.bookable ? (
          <>
            <Link className={styles.primary} href={reserve}>
              See prices and dates
            </Link>
            <p className={styles.note}>
              Sign in to see every cabin’s price for every departure, and reserve. The “from” price is per person for two sharing
              the lowest-priced cabin with places left.
              {v.gratuityUsdMinor
                ? ` Crew gratuities of ${formatMoney({ amount: v.gratuityUsdMinor, currency: "USD" }, locale)} per person per night are separate and paid on board.`
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

      {v.photos.length ? (
        <Gallery label={`${v.name}: photos`} items={v.photos.map((p) => ({ image: p, caption: p.alt }))} />
      ) : null}

      {v.description ? (
        <section className={styles.section}>
          <h2>About {v.name}</h2>
          <p className={styles.prose}>{v.description}</p>
        </section>
      ) : null}

      <section className={styles.section} id="itinerary">
        <h2>Itinerary</h2>
        {it ? (
          <ItinerarySwitch
            defaultCode={it.code}
            panels={v.itineraries.map((i) => ({
              code: i.code,
              label: `${i.origin} → ${i.destination}, ${i.nights} nights`,
              node: <ItineraryDetails v={v} it={i} locale={locale} />,
            }))}
          />
        ) : (
          <p className={styles.note}>No itinerary is published for this vessel yet.</p>
        )}
      </section>

      <section className={styles.section} id="cabins">
        <h2>Cabins and decks</h2>
        <DeckPlan cabins={v.cabins} />
      </section>

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
    </div>
  );
}

/** One itinerary: check-in to check-out (DATA-018), the sailing time (PROPOSED-019), the days and the next departures. */
function ItineraryDetails({ v, it, locale }: { v: VesselPage; it: VesselItinerary; locale: Locale }) {
  const sails = sailingTimeText(it.sailingPeriod, it.sailsAt, it.origin);
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
        <ItineraryTimeline
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
        <>
          <h3>Next departures</h3>
          <ul className={styles.dates}>
            {it.departures.slice(0, 8).map((d) => (
              <li key={d}>
                <time dateTime={d}>{formatDay(d, locale)}</time>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
