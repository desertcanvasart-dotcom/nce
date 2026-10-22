import type { Metadata } from "next";
import { DeckPlan } from "@/components/marketplace/DeckPlan";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ActionForm } from "@/components/dashboard/ActionForm";
import { Checkboxes, Input } from "@/components/dashboard/ui";
import { gratuityText } from "@/lib/product/pricing";
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
  sightseeingText,
  preferredPrices,
  availabilityLabel,
  availabilityUpdated,
  canBook,
  type BookingMode,
  type DeparturePrice,
} from "@/lib/marketplace/vessel";
import { routeId } from "@/lib/marketplace/listing";
import { bandLines, type CancellationBand } from "@/lib/tours/tours";
import { pageMetadata } from "@/lib/seo/metadata";
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
  return pageMetadata({ locale, path: `/cruises/${slug}/reserve`, title: "Prices and dates", noindex: true });
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
  await requireUser(here);
  const v = await publicVessel(slug);
  if (!v) notFound();
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
          { name: "Home", path: "/" },
          { name: "Cruises", path: "/cruises/" },
          { name: v.name, path: `/cruises/${slug}/` },
          { name: "Prices and dates", path: base },
        ]}
      />
      <header className={styles.head}>
        <h1 className={styles.title}>Prices and dates: {v.name}</h1>
        <p className={styles.lead}>
          {it ? `${it.origin} to ${it.destination}, ${it.nights} nights. ` : ""}Published prices per person, from check-in to
          check-out. Crew gratuities are separate and paid on board.
        </p>
      </header>

      {v.itineraries.length > 1 ? (
        <nav aria-label="Itineraries" className={styles.facets}>
          <ul>
            {v.itineraries.map((i) => (
              <li key={i.id}>
                {i.id === it?.id ? (
                  <span aria-current="page">
                    {i.origin} → {i.destination}, {i.nights} nights
                  </span>
                ) : (
                  <Link href={`${base}?itinerary=${encodeURIComponent(i.code)}`}>
                    {i.origin} → {i.destination}, {i.nights} nights
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      {it && offer ? (
        <nav aria-label="Package" className={styles.facets}>
          <ul>
            {(
              [
                ["cruise", "Cruise only"],
                [offer, "With sightseeing"],
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
              ? `The vessel's own sightseeing is in the price: ${sightseeingText(it.sightseeing)}`
              : pkg === "with_programme" && it.programme
                ? `With Nilecruz's ${it.programme.name}: a separate booking with Nilecruz, with an Egyptologist guide and entrance fees, paid together with your cruise.`
                : "Cruise only: choose “With sightseeing” to add it."}
          </p>
        </nav>
      ) : null}

      {!v.bookable || !it || !departures.length ? (
        <p className={styles.note}>
          Nothing on this vessel can be booked online right now.{" "}
          <Link
            href={`/dashboard/journey/requests/?route=${encodeURIComponent(`${it?.origin ?? ""}→${it?.destination ?? ""}`)}#new`}
          >
            Ask operators for an offer
          </Link>{" "}
          instead.
        </p>
      ) : !dep ? (
        <section className={styles.section} aria-labelledby="deps">
          <h2 id="deps">1. Choose a departure</h2>
          <ul className={styles.list}>
            {departures.map((d) => {
              const first = d[0]!;
              const prices = d.filter((r) => canBook(r) && r.double).map((r) => r.double!);
              const instant = d.some((r) => canBook(r) && r.mode === "instant");
              return (
                <li key={first.departureId}>
                  <Link href={keep({ dep: first.departureId })}>
                    {formatDay(first.departsOn, locale)} to {formatDay(first.returnsOn, locale)}
                  </Link>{" "}
                  {prices.length ? (
                    <span>
                      from {formatMoney({ amount: Math.min(...prices), currency: first.currency }, locale)} per person, two
                      sharing · {instant ? "instant confirmation" : `confirmed within ${confirmHours} h`} · pay in full by{" "}
                      {/* EXP-006: the deadline if booked today, by the same rules as the reservation (ADR-027). */}
                      {formatDay(paymentDeadline(today, first.departsOn, periods).dueOn, locale)}
                    </span>
                  ) : (
                    <span className={styles.note}>{d.some((r) => r.mode === "sold_out") ? "sold out" : "to be confirmed"}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ) : !chosen || quote === null ? (
        <section className={styles.section} aria-labelledby="cabin">
          <h2 id="cabin">
            2. Choose a deck and cabin · {formatDay(dep[0]!.departsOn, locale)} to {formatDay(dep[0]!.returnsOn, locale)}
          </h2>
          <p>
            <Link href={keep({})}>← Other departures</Link>
          </p>
          {!openOn(dep) ? (
            <div className={styles.note}>
              <p>Sold out on this date.</p>
              {nearby.length ? (
                <p>
                  Nearby dates on {v.name}:{" "}
                  {nearby.map((d, i) => (
                    <span key={d[0]!.departureId}>
                      {i ? ", " : ""}
                      <Link href={keep({ dep: d[0]!.departureId })}>{formatDay(d[0]!.departsOn, locale)}</Link>
                    </span>
                  ))}
                  .
                </p>
              ) : null}
              <p>
                <Link href={similar}>Similar ships on this route</Link>
              </p>
            </div>
          ) : null}
          {chosen && quote === null ? (
            <p className={styles.note}>
              That cabin can’t take this party on this departure. Choose another cabin or change the guests.
            </p>
          ) : null}
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
                <legend>{g.deck} deck</legend>
                {g.cabins.map((c) => {
                  const r = dep.find((x) => x.cabinTypeId === c.id)!;
                  const open = canBook(r);
                  const label = availabilityLabel(r, confirmHours);
                  return (
                    <label key={c.id} className={styles.cabinOption}>
                      <input type="radio" name="cabin" value={c.id} required disabled={!open} defaultChecked={q.cabin === c.id} />
                      <span className="visually-hidden">Cabin type</span>
                      <span>
                        <strong>{c.name}</strong>
                        <small>
                          {[c.sizeM2 ? `${c.sizeM2} m²` : null, c.bed, `sleeps ${c.maxOccupancy}`, c.view]
                            .filter(Boolean)
                            .join(" · ")}
                        </small>
                        <small>
                          {r.double
                            ? `${formatMoney({ amount: r.double, currency: r.currency }, locale)} per person, two sharing`
                            : ""}
                          {r.single ? ` · ${formatMoney({ amount: r.single, currency: r.currency }, locale)} alone` : ""}
                          {r.supplement
                            ? ` · plus ${formatMoney({ amount: r.supplement, currency: r.currency }, locale)} per adult in supplements`
                            : ""}
                        </small>
                        <em>{label}</em>
                        {r.confirmedAt && r.mode !== "sold_out" ? <small>{availabilityUpdated(r.confirmedAt)}</small> : null}
                      </span>
                    </label>
                  );
                })}
              </fieldset>
            ))}
            <div className={styles.party}>
              <label>
                Adults per cabin (18 and over)
                <select name="adults" defaultValue={String(adults)}>
                  {[1, 2, 3].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
              <label>
                Children’s ages, per cabin (optional)
                <input name="children" defaultValue={q.children ?? ""} inputMode="numeric" placeholder="7, 4" maxLength={20} />
              </label>
              <label>
                Cabins like this
                <select name="cabins" defaultValue={String(cabinsWanted)}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
            </div>
            <button type="submit" className={styles.primary}>
              See the price
            </button>
          </form>
        </section>
      ) : (
        <section className={styles.section} aria-labelledby="guests">
          <h2 id="guests">3. Guests and reserving</h2>
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
              ← Change the cabin or guests
            </Link>
          </p>
          <dl className={styles.facts}>
            <div>
              <dt>Departure</dt>
              <dd>
                {formatDay(chosen.departsOn, locale)} to {formatDay(chosen.returnsOn, locale)}
              </dd>
            </div>
            <div>
              <dt>Cabin</dt>
              <dd>
                {cabinsWanted} × {cabinType!.name}, {cabinType!.deck} deck
              </dd>
            </div>
            <div>
              <dt>Guests per cabin</dt>
              <dd>
                {adults} adult{adults === 1 ? "" : "s"}
                {childAges.length ? `, children aged ${childAges.join(", ")}` : ""}
              </dd>
            </div>
            <div>
              <dt>Total</dt>
              <dd>
                <strong>{formatMoney({ amount: quote * cabinsWanted, currency: chosen.currency }, locale)}</strong>
              </dd>
            </div>
            {programme ? (
              <>
                <div>
                  <dt>Sightseeing by Nilecruz</dt>
                  <dd>
                    {formatMoney({ amount: programme.total, currency: programme.currency }, locale)} · {programme.name}, a
                    separate booking with Nilecruz
                  </dd>
                </div>
                {programme.currency === chosen.currency ? (
                  <div>
                    <dt>Together</dt>
                    <dd>
                      <strong>
                        {formatMoney({ amount: quote * cabinsWanted + programme.total, currency: chosen.currency }, locale)}
                      </strong>{" "}
                      paid on one page
                    </dd>
                  </div>
                ) : (
                  <div>
                    <dt>Currency</dt>
                    <dd>
                      The sightseeing is priced in {programme.currency}; choose a cabin priced in {programme.currency} to add it.
                    </dd>
                  </div>
                )}
              </>
            ) : null}
            {v.gratuityUsdMinor && it ? (
              <div>
                <dt>Crew gratuity</dt>
                <dd>
                  {gratuityText(v.gratuityUsdMinor, {
                    nights: it.nights,
                    ages: Array.from({ length: cabinsWanted }, () => ages).flat(),
                  })}
                </dd>
              </div>
            ) : null}
          </dl>
          <p className={styles.note}>
            {perPersonFor(chosen, ages)
              ? `${formatMoney({ amount: perPersonFor(chosen, ages)!, currency: chosen.currency }, locale)} per adult; `
              : ""}
            children are priced by age.{" "}
            {chosen.supplement
              ? `The total includes ${formatMoney({ amount: chosen.supplement, currency: chosen.currency }, locale)} per adult in compulsory supplements for these dates${supplements.length ? ` (${supplements.join(", ")})` : ""}. `
              : ""}
            {pkg === "with_sightseeing"
              ? "The total holds the cruise fare and the vessel's own sightseeing; transfers, flights and other tours are booked separately."
              : "The total holds the cruise fare only (DATA-017): transfers, flights and tours are booked separately."}
          </p>
          {chosen.mode === "instant" && chosen.placesLeft !== null && chosen.placesLeft < cabinsWanted ? (
            <p className={styles.note}>Only {chosen.placesLeft} of these cabins are left. Choose fewer cabins.</p>
          ) : (
            <>
              <h3>Cancellation policy</h3>
              {policy ? (
                <ul className={styles.list}>
                  {bandLines(policy.bands as CancellationBand[], "departure").map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ul>
              ) : null}
              {chosen.mode === "request" ? (
                <p className={styles.note}>
                  The operator confirms these cabins before you pay, usually within {confirmHours} hours. Nothing is charged until
                  then.
                </p>
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
                submit={chosen.mode === "request" ? "Send booking request" : "Reserve"}
              >
                <p className={styles.note}>
                  Full names as in passports and dates of birth for all {cabinsWanted * ages.length} guests; ages on the departure
                  date must match. The first guest is the lead passenger.
                </p>
                {Array.from({ length: cabinsWanted * ages.length }, (_, i) => (
                  <div key={i} className={styles.party}>
                    <Input
                      label={`Cabin ${Math.floor(i / ages.length) + 1}, guest ${(i % ages.length) + 1}: full name`}
                      name={`name_${i}`}
                      required
                      maxLength={160}
                      autoComplete={i === 0 ? "name" : "off"}
                    />
                    <Input label="Date of birth" name={`dob_${i}`} type="date" required />
                    {i === 0 ? (
                      <Input label="Nationality" name="nationality" maxLength={2} hint="Two-letter code, for example GB." />
                    ) : null}
                  </div>
                ))}
                <Checkboxes
                  legend="Agreement"
                  name="terms"
                  options={[{ value: "yes", label: "I have read the terms and the cancellation policy" }]}
                  checked={[]}
                />
                <p className={styles.note}>
                  {chosen.mode === "request"
                    ? "We send your request to the operator now. When they confirm, you pay in My journey."
                    : "Reserving checks the cabins are still free and holds them for you. Payment details and the deadline follow in My journey."}
                </p>
              </ActionForm>
            </>
          )}
        </section>
      )}
    </div>
  );
}
