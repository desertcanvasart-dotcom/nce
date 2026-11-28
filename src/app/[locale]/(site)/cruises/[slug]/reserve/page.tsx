import type { Metadata } from "next";
import { DeckPlan } from "@/components/marketplace/DeckPlan";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ActionForm } from "@/components/dashboard/ActionForm";
import { Checkboxes, Input } from "@/components/dashboard/ui";
import { formatMoney } from "@/components/ds/lib/format";
import { Breadcrumbs } from "@/components/marketplace/Breadcrumbs";
import styles from "@/components/marketplace/marketplace.module.css";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { parseChildAges } from "@/lib/partners/search";
import {
  deckGroups,
  formatDay,
  perPersonFor,
  pickItinerary,
  preferredPrices,
  confirmedAgo,
  canBook,
  type BookingMode,
  type DeparturePrice,
} from "@/lib/marketplace/vessel";
import { routeId } from "@/lib/marketplace/listing";
import type { CancellationBand } from "@/lib/tours/tours";
import { localizedPath, pageMetadata } from "@/lib/seo/metadata";
import { requireUser } from "@/server/auth";
import { policyFor } from "@/server/bookings/queries";
import { premiumPeriods } from "@/server/payments/queries";
import { paymentDeadline } from "@/lib/payments/deadlines";
import { getDb } from "@/server/db";
import { publicVessel } from "@/server/marketplace/queries";
import { customerRequestBooking, customerReserve } from "./actions";

type Query = {
  itinerary?: string;
  dep?: string;
  cabin?: string;
  adults?: string;
  children?: string;
  cabins?: string;
  pkg?: string;
};
type Props = { params: Promise<{ locale: Locale; slug: string }>; searchParams: Promise<Query> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "vesselPage.reserve" });
  return pageMetadata({ locale, path: `/cruises/${slug}/reserve`, title: t("title"), noindex: true });
}

const UUID = /^[0-9a-f-]{36}$/;

/**
 * DATA-033, DASH-PUB-008, 009, DASH-CUS-016, 017 (ADR-093): signed in, every cabin's price for every departure at the
 * published rate; choose a departure, then a deck and cabin type and the party, then name every guest and reserve.
 */
export default async function ReserveOnVessel({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const q = await searchParams;
  const here = `/cruises/${slug}/reserve/?${new URLSearchParams(q as Record<string, string>).toString()}`;
  await requireUser(locale === "ja" ? localizedPath(locale, `/cruises/${slug}/reserve`) + here.slice(here.indexOf("?")) : here);
  // The vessel's own words in Japanese where its data has them; every other language reads the English, as before.
  const v = await publicVessel(slug, locale === "ja" ? "ja" : "en");
  if (!v) notFound();
  const tv = await getTranslations({ locale, namespace: "vesselPage" });
  const t = await getTranslations({ locale, namespace: "vesselPage.reserve" });
  const places = tv.raw("places") as Record<string, string>;
  const place = (n: string) => (locale === "ja" ? (places[n] ?? n) : n);
  const sep = t("listJoin");
  const money = (amount: number, currency: string) => formatMoney({ amount, currency: currency as "EUR" }, locale);
  const range = (from: string, to: string) => t("range", { from: formatDay(from, locale), to: formatDay(to, locale) });
  const it = pickItinerary(v.itineraries, q.itinerary);
  // ADR-102: an approved vessel sells this itinerary with its own sightseeing too; the traveller chooses first.
  // ADR-102: or, on every other vessel, the cruise with Nilecruz's programme (its own order, paid together).
  const offer = it?.sightseeing ? ("with_sightseeing" as const) : it?.programme ? ("with_programme" as const) : null;
  const pkg = offer && q.pkg === offer ? offer : ("cruise" as const);
  const db = await getDb();
  const { data } = await db.rpc("vessel_departure_prices", {
    target: v.id,
    pkg: pkg === "with_sightseeing" ? pkg : "cruise",
  });
  const rows: DeparturePrice[] = preferredPrices(
    (data ?? []).map((r) => ({
      departureId: r.departure_id,
      scheduleId: r.schedule_id,
      departsOn: r.departs_on,
      returnsOn: r.returns_on,
      cabinTypeId: r.cabin_type_id,
      currency: r.currency,
      single: r.single_minor === null ? null : Number(r.single_minor),
      double: r.double_minor === null ? null : Number(r.double_minor),
      triple: r.triple_minor === null ? null : Number(r.triple_minor),
      placesLeft: r.places_left,
      bookable: r.bookable,
      mode: r.booking_mode as BookingMode,
      supplement: Number(r.supplement_minor ?? 0),
      confirmedAt: r.confirmed_at,
    })),
  ).filter((r) => r.scheduleId === it?.id);
  const departures = [...new Set(rows.map((r) => r.departureId))].map((id) => rows.filter((r) => r.departureId === id));
  const dep = q.dep && UUID.test(q.dep) ? departures.find((d) => d[0]!.departureId === q.dep) : undefined;
  const adults = Math.min(3, Math.max(1, Number(q.adults) || 2));
  const childAges = parseChildAges(q.children ?? "") ?? [];
  const ages = [...Array(adults).fill(30), ...childAges];
  const cabinsWanted = Math.min(5, Math.max(1, Number(q.cabins) || 1));
  const chosen = dep && q.cabin ? dep.find((r) => r.cabinTypeId === q.cabin) : undefined;
  const cabinType = chosen ? v.cabins.find((c) => c.id === chosen.cabinTypeId) : undefined;
  const base = `/cruises/${slug}/reserve/`;
  const keep = (extra: Record<string, string>) =>
    `${base}?${new URLSearchParams({ ...(it ? { itinerary: it.code } : {}), ...(pkg !== "cruise" ? { pkg } : {}), ...extra }).toString()}`;

  let quote: number | null = null;
  if (chosen && cabinType && chosen.bookable && ages.filter((a) => a >= 3).length <= cabinType.maxOccupancy) {
    const { data: p } = await db.rpc("public_party_price", {
      dep: chosen.departureId,
      cab: chosen.cabinTypeId,
      cur: chosen.currency,
      ages,
      pkg: pkg === "with_sightseeing" ? pkg : "cruise",
    });
    quote = p === null || p === undefined ? null : Number(p);
  }
  // ADR-102: Nilecruz's programme for the whole party, priced by the database; a separate order paid with the cruise.
  let programme: { name: string; total: number; currency: string } | null = null;
  if (pkg === "with_programme" && chosen && quote !== null) {
    const { data: pq } = await db.rpc("programme_quote", {
      dep: chosen.departureId,
      ages: Array.from({ length: cabinsWanted }, () => ages).flat(),
    });
    const row = pq?.[0];
    if (row) programme = { name: row.tour_name, total: Number(row.total_minor), currency: row.currency };
  }
  const policy = chosen ? await policyFor(chosen.departureId) : null;
  // ADR-103: what the supplements are, for the chosen cabin and currency.
  const supplements =
    chosen && chosen.supplement
      ? ((await db.rpc("sailing_supplements", { dep: chosen.departureId })).data ?? [])
          .filter((s) => s.currency === chosen.currency && (s.cabin_type_id === null || s.cabin_type_id === chosen.cabinTypeId))
          .map((s) => s.name)
      : [];
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });
  const periods = await premiumPeriods();
  // ADR-099: how long the operator usually takes to confirm a booking request.
  const { data: owner } = await db.from("vessels").select("operator_org_id").eq("id", v.id).maybeSingle();
  const { data: hours } = owner?.operator_org_id
    ? await db.rpc("operator_confirm_hours", { target_org: owner.operator_org_id })
    : { data: 24 };
  const confirmHours = Number(hours ?? 24);
  const openOn = (d: DeparturePrice[]) => d.some(canBook);
  // The words of availabilityLabel and availabilityUpdated (lib/marketplace/vessel), in the visitor's language.
  const availability = (r: DeparturePrice) =>
    r.mode === "sold_out"
      ? t("availability.soldOut")
      : r.mode === "unconfirmed"
        ? t("availability.unconfirmed")
        : r.mode === "request"
          ? t("availability.request", { hours: String(confirmHours) })
          : r.placesLeft !== null && r.placesLeft <= 2
            ? t("availability.last")
            : t("availability.instant");
  const updated = (confirmedAt: string) => {
    const { n, unit } = confirmedAgo(confirmedAt);
    return unit === "now" ? t("updated.now") : t(`updated.${unit}`, { n });
  };
  const bandLine = (bands: CancellationBand[]) => {
    const sorted = [...bands].sort((a, b) => b.from_days - a.from_days);
    if (sorted.length === 1 && sorted[0]!.from_days === 0) return [t("bandAny", { percent: String(sorted[0]!.percent) })];
    return sorted.map((b, i) => {
      const prev = sorted[i - 1];
      const percent = String(b.percent);
      return !prev
        ? t("bandFirst", { days: String(b.from_days), percent })
        : b.from_days === 0
          ? t("bandLast", { days: String(prev.from_days), percent })
          : t("bandBetween", { from: String(b.from_days), to: String(prev.from_days - 1), percent });
    });
  };
  const gratuity = (perPersonPerNightMinor: number, party: { nights: number; ages: number[] }) => {
    const usd = (m: number) => formatMoney({ amount: m, currency: "USD" }, locale === "ja" ? "ja" : "en");
    const counted = party.ages.filter((a) => a >= 3).length;
    return t("gratuity", {
      amount: usd(perPersonPerNightMinor),
      total: counted
        ? t("gratuityTotal", { amount: usd(perPersonPerNightMinor * party.nights * counted), nights: String(party.nights) })
        : "",
    });
  };
  // Sold out on the chosen date: the nearest dates on this ship with something bookable, and similar ships.
  const nearby =
    dep && !openOn(dep)
      ? departures
          .filter((d) => d[0]!.departureId !== dep[0]!.departureId && openOn(d))
          .sort(
            (a, b) =>
              Math.abs(Date.parse(a[0]!.departsOn) - Date.parse(dep[0]!.departsOn)) -
              Math.abs(Date.parse(b[0]!.departsOn) - Date.parse(dep[0]!.departsOn)),
          )
          .slice(0, 3)
      : [];
  const similar = it
    ? `/cruises/?${new URLSearchParams({ route: routeId(it.origin, it.destination), vessel: v.type, ...(dep ? { date: dep[0]!.departsOn } : {}) }).toString()}`
    : "/cruises/";

  return (
    <div className={styles.page}>
      <Breadcrumbs
        locale={locale}
        trail={[
          { name: tv("crumbs.home"), path: "/" },
          { name: tv("crumbs.cruises"), path: "/cruises/" },
          { name: v.name, path: `/cruises/${slug}/` },
          { name: t("title"), path: base },
        ]}
      />
      <header className={styles.head}>
        <h1 className={styles.title}>{t("heading", { name: v.name })}</h1>
        <p className={styles.lead}>
          {it ? t("leadRoute", { origin: place(it.origin), destination: place(it.destination), nights: String(it.nights) }) : ""}
          {t("lead")}
        </p>
      </header>

      {v.itineraries.length > 1 ? (
        <nav aria-label={t("itineraries")} className={styles.facets}>
          <ul>
            {v.itineraries.map((i) => (
              <li key={i.id}>
                {i.id === it?.id ? (
                  <span aria-current="page">
                    {t("itinerary", { origin: place(i.origin), destination: place(i.destination), nights: String(i.nights) })}
                  </span>
                ) : (
                  <Link href={`${base}?itinerary=${encodeURIComponent(i.code)}`}>
                    {t("itinerary", { origin: place(i.origin), destination: place(i.destination), nights: String(i.nights) })}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      {it && offer ? (
        <nav aria-label={t("package")} className={styles.facets}>
          <ul>
            {(
              [
                ["cruise", t("cruiseOnly")],
                [offer, t("withSightseeing")],
              ] as const
            ).map(([value, label]) => (
              <li key={value}>
                {value === pkg ? (
                  <span aria-current="page">{label}</span>
                ) : (
                  <Link
                    href={`${base}?${new URLSearchParams({ itinerary: it.code, ...(value !== "cruise" ? { pkg: value } : {}) }).toString()}`}
                  >
                    {label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
          <p className={styles.note}>
            {pkg === "with_sightseeing" && it.sightseeing
              ? t("vesselSightseeing", {
                  text: t("sightseeingText", {
                    parts: [
                      it.sightseeing.guide ? tv("itinerary.guide") : null,
                      it.sightseeing.ticketsIncluded ? tv("itinerary.fees") : tv("itinerary.noFees"),
                    ]
                      .filter(Boolean)
                      .join(sep),
                    sites: it.sightseeing.sites.join(sep),
                  }).replace(/^./, (c) => c.toUpperCase()),
                })
              : pkg === "with_programme" && it.programme
                ? t("programme", { name: it.programme.name })
                : t("cruiseOnlyNote")}
          </p>
        </nav>
      ) : null}

      {!v.bookable || !it || !departures.length ? (
        <p className={styles.note}>
          {t.rich("notBookable", {
            link: (c) => (
              <Link
                href={`/dashboard/journey/requests/?route=${encodeURIComponent(`${it?.origin ?? ""}→${it?.destination ?? ""}`)}#new`}
              >
                {c}
              </Link>
            ),
          })}
        </p>
      ) : !dep ? (
        <section className={styles.section} aria-labelledby="deps">
          <h2 id="deps">{t("step1")}</h2>
          <ul className={styles.list}>
            {departures.map((d) => {
              const first = d[0]!;
              const prices = d.filter((r) => canBook(r) && r.double).map((r) => r.double!);
              const instant = d.some((r) => canBook(r) && r.mode === "instant");
              return (
                <li key={first.departureId}>
                  <Link href={keep({ dep: first.departureId })}>{range(first.departsOn, first.returnsOn)}</Link>{" "}
                  {prices.length ? (
                    <span>
                      {t("from", { price: money(Math.min(...prices), first.currency) })} ·{" "}
                      {instant ? t("instantMode") : t("within", { hours: String(confirmHours) })} · {t("payBy")}{" "}
                      {/* EXP-006: the deadline if booked today, by the same rules as the reservation (ADR-027). */}
                      {formatDay(paymentDeadline(today, first.departsOn, periods).dueOn, locale)}
                    </span>
                  ) : (
                    <span className={styles.note}>
                      {d.some((r) => r.mode === "sold_out") ? t("soldOutShort") : t("unconfirmedShort")}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ) : !chosen || quote === null ? (
        <section className={styles.section} aria-labelledby="cabin">
          <h2 id="cabin">
            {t("step2", { from: formatDay(dep[0]!.departsOn, locale), to: formatDay(dep[0]!.returnsOn, locale) })}
          </h2>
          <p>
            <Link href={keep({})}>{t("otherDepartures")}</Link>
          </p>
          {!openOn(dep) ? (
            <div className={styles.note}>
              <p>{t("soldOutDate")}</p>
              {nearby.length ? (
                <p>
                  {t("nearby", { name: v.name })}{" "}
                  {nearby.map((d, i) => (
                    <span key={d[0]!.departureId}>
                      {i ? sep : ""}
                      <Link href={keep({ dep: d[0]!.departureId })}>{formatDay(d[0]!.departsOn, locale)}</Link>
                    </span>
                  ))}
                  {t("end")}
                </p>
              ) : null}
              <p>
                <Link href={similar}>{t("similar")}</Link>
              </p>
            </div>
          ) : null}
          {chosen && quote === null ? <p className={styles.note}>{t("cannotTake")}</p> : null}
          {/* EXP-002: the decks, each cabin type coloured by how it books on this sailing; choosing one ticks it below. */}
          <DeckPlan
            cabins={v.cabins.filter((c) => dep.some((r) => r.cabinTypeId === c.id))}
            maxGuests={v.maxGuests}
            sharedSpaces={v.sharedSpaces}
            modes={Object.fromEntries(dep.map((r) => [r.cabinTypeId, r.mode]))}
            chooseInForm
          />
          <form method="get" action={base} className={styles.reserveForm}>
            {it ? <input type="hidden" name="itinerary" value={it.code} /> : null}
            {pkg !== "cruise" ? <input type="hidden" name="pkg" value={pkg} /> : null}
            <input type="hidden" name="dep" value={dep[0]!.departureId} />
            {deckGroups(v.cabins.filter((c) => dep.some((r) => r.cabinTypeId === c.id))).map((g) => (
              <fieldset key={g.deck} className={styles.deck}>
                <legend>{tv("deckView.deck", { name: g.deck })}</legend>
                {g.cabins.map((c) => {
                  const r = dep.find((x) => x.cabinTypeId === c.id)!;
                  const open = canBook(r);
                  const label = availability(r);
                  return (
                    <label key={c.id} className={styles.cabinOption}>
                      <input type="radio" name="cabin" value={c.id} required disabled={!open} defaultChecked={q.cabin === c.id} />
                      <span className="visually-hidden">{t("cabinType")}</span>
                      <span>
                        <strong>{c.name}</strong>
                        <small>
                          {[c.sizeM2 ? `${c.sizeM2} m²` : null, c.bed, tv("deckView.sleeps", { n: c.maxOccupancy }), c.view]
                            .filter(Boolean)
                            .join(" · ")}
                        </small>
                        <small>
                          {r.double ? t("priceDouble", { price: money(r.double, r.currency) }) : ""}
                          {r.single ? ` · ${t("priceSingle", { price: money(r.single, r.currency) })}` : ""}
                          {r.supplement ? ` · ${t("priceSupplement", { price: money(r.supplement, r.currency) })}` : ""}
                        </small>
                        <em>{label}</em>
                        {r.confirmedAt && r.mode !== "sold_out" ? <small>{updated(r.confirmedAt)}</small> : null}
                      </span>
                    </label>
                  );
                })}
              </fieldset>
            ))}
            <div className={styles.party}>
              <label>
                {t("adults")}
                <select name="adults" defaultValue={String(adults)}>
                  {[1, 2, 3].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
              <label>
                {t("children")}
                <input name="children" defaultValue={q.children ?? ""} inputMode="numeric" placeholder="7, 4" maxLength={20} />
              </label>
              <label>
                {t("cabinsLike")}
                <select name="cabins" defaultValue={String(cabinsWanted)}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
            </div>
            <button type="submit" className={styles.primary}>
              {t("seePrice")}
            </button>
          </form>
        </section>
      ) : (
        <section className={styles.section} aria-labelledby="guests">
          <h2 id="guests">{t("step3")}</h2>
          <p>
            <Link
              href={keep({
                dep: chosen.departureId,
                cabin: chosen.cabinTypeId,
                adults: String(adults),
                children: q.children ?? "",
                cabins: String(cabinsWanted),
              })}
            >
              {t("change")}
            </Link>
          </p>
          <dl className={styles.facts}>
            <div>
              <dt>{t("departure")}</dt>
              <dd>{range(chosen.departsOn, chosen.returnsOn)}</dd>
            </div>
            <div>
              <dt>{t("cabin")}</dt>
              <dd>{t("cabinValue", { n: String(cabinsWanted), name: cabinType!.name, deck: cabinType!.deck })}</dd>
            </div>
            <div>
              <dt>{t("guestsPerCabin")}</dt>
              <dd>
                {t("adultCount", { n: adults })}
                {childAges.length ? t("childrenAged", { ages: childAges.join(sep) }) : ""}
              </dd>
            </div>
            <div>
              <dt>{t("total")}</dt>
              <dd>
                <strong>{formatMoney({ amount: quote * cabinsWanted, currency: chosen.currency }, locale)}</strong>
              </dd>
            </div>
            {programme ? (
              <>
                <div>
                  <dt>{t("byNilecruz")}</dt>
                  <dd>
                    {money(programme.total, programme.currency)} · {t("programmeSeparate", { name: programme.name })}
                  </dd>
                </div>
                {programme.currency === chosen.currency ? (
                  <div>
                    <dt>{t("together")}</dt>
                    <dd>
                      <strong>
                        {formatMoney({ amount: quote * cabinsWanted + programme.total, currency: chosen.currency }, locale)}
                      </strong>{" "}
                      {t("onePage")}
                    </dd>
                  </div>
                ) : (
                  <div>
                    <dt>{t("currency")}</dt>
                    <dd>{t("currencyNote", { currency: programme.currency })}</dd>
                  </div>
                )}
              </>
            ) : null}
            {v.gratuityUsdMinor && it ? (
              <div>
                <dt>{t("gratuityLabel")}</dt>
                <dd>
                  {gratuity(v.gratuityUsdMinor, {
                    nights: it.nights,
                    ages: Array.from({ length: cabinsWanted }, () => ages).flat(),
                  })}
                </dd>
              </div>
            ) : null}
          </dl>
          <p className={styles.note}>
            {perPersonFor(chosen, ages) ? t("perAdult", { price: money(perPersonFor(chosen, ages)!, chosen.currency) }) : ""}
            {t("byAge")}{" "}
            {chosen.supplement
              ? t("includesSupplements", {
                  price: money(chosen.supplement, chosen.currency),
                  names: supplements.length ? t("supplementNames", { list: supplements.join(sep) }) : "",
                })
              : ""}
            {pkg === "with_sightseeing" ? t("totalSightseeing") : t("totalCruise")}
          </p>
          {chosen.mode === "instant" && chosen.placesLeft !== null && chosen.placesLeft < cabinsWanted ? (
            <p className={styles.note}>{t("onlyLeft", { n: String(chosen.placesLeft) })}</p>
          ) : (
            <>
              <h3>{t("policy")}</h3>
              {policy ? (
                <ul className={styles.list}>
                  {bandLine(policy.bands as CancellationBand[]).map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ul>
              ) : null}
              {chosen.mode === "request" ? (
                <p className={styles.note}>{t("requestNote", { hours: String(confirmHours) })}</p>
              ) : null}
              <ActionForm
                action={(chosen.mode === "request" ? customerRequestBooking : customerReserve).bind(null, slug, {
                  departureId: chosen.departureId,
                  departsOn: chosen.departsOn,
                  package: pkg,
                  cabinTypeId: chosen.cabinTypeId,
                  currency: chosen.currency,
                  cabins: cabinsWanted,
                  ages,
                })}
                submit={chosen.mode === "request" ? t("sendRequest") : t("reserve")}
              >
                <input type="hidden" name="locale" value={locale} />
                <p className={styles.note}>{t("namesNote", { n: String(cabinsWanted * ages.length) })}</p>
                {Array.from({ length: cabinsWanted * ages.length }, (_, i) => (
                  <div key={i} className={styles.party}>
                    <Input
                      label={t("guestName", {
                        cabin: String(Math.floor(i / ages.length) + 1),
                        guest: String((i % ages.length) + 1),
                      })}
                      name={`name_${i}`}
                      required
                      maxLength={160}
                      autoComplete={i === 0 ? "name" : "off"}
                    />
                    <Input label={t("dob")} name={`dob_${i}`} type="date" required />
                    {i === 0 ? (
                      <Input label={t("nationality")} name="nationality" maxLength={2} hint={t("nationalityHint")} />
                    ) : null}
                  </div>
                ))}
                <Checkboxes legend={t("agreement")} name="terms" options={[{ value: "yes", label: t("agree") }]} checked={[]} />
                <p className={styles.note}>{chosen.mode === "request" ? t("afterRequest") : t("afterReserve")}</p>
              </ActionForm>
            </>
          )}
        </section>
      )}
    </div>
  );
}
