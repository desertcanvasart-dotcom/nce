import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ds/Button/Button";
import { formatMoney } from "@/components/ds/lib/format";
import { Input, Notice, Section, Select, ui } from "@/components/dashboard/ui";
import { groupSearch, parseChildAges, TIER_LABEL, type SearchRow } from "@/lib/partners/search";
import { sailingTimeText, type SailingPeriod } from "@/lib/product/sailing-time";
import { cairoDate } from "@/lib/tours/tours";
import { requireOrgRole } from "@/server/auth";
import { routeOptions } from "@/server/bookings/queries";
import { getDb } from "@/server/db";
import { isUuid } from "../../../sections";

type Query = { from?: string; to?: string; route?: string; nights?: string; adults?: string; children?: string };
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** DASH-B2B-001, 002 (ADR-092): bookable departures at the rate this company is entitled to, priced for one cabin. */
export default async function PartnerSearch({
  params,
  searchParams,
}: {
  params: Promise<{ orgId: string }>;
  searchParams: Promise<Query>;
}) {
  const { orgId } = await params;
  if (!isUuid(orgId)) notFound();
  await requireOrgRole(orgId, ["owner", "reservations"], { kind: "partner", returnTo: `/dashboard/partner/${orgId}/search/` });
  const q = await searchParams;
  const routes = await routeOptions();
  const today = cairoDate(new Date());
  const from = q.from && DAY.test(q.from) ? q.from : "";
  const to = q.to && DAY.test(q.to) ? q.to : "";
  const adults = Math.min(3, Math.max(1, Number(q.adults) || 2));
  const childAges = parseChildAges(q.children ?? "");
  const [origin, destination] = q.route ? q.route.split("→") : [undefined, undefined];
  const nights = q.nights && /^\d{1,2}$/.test(q.nights) ? Number(q.nights) : null;

  let results: ReturnType<typeof groupSearch> | null = null;
  let problem: string | null = null;
  if (from && to) {
    if (childAges === null) problem = "Give children's ages as whole numbers under 18, separated by commas.";
    else {
      const db = await getDb();
      const { data, error } = await db.rpc("partner_search", {
        org: orgId,
        from_day: from,
        to_day: to,
        route_origin: origin || undefined,
        route_destination: destination || undefined,
        nights_min: nights ?? 1,
        nights_max: nights ?? 21,
      });
      if (error) problem = error.message;
      else results = groupSearch((data ?? []) as unknown as SearchRow[], { adults, childAges });
    }
  }
  const money = (m: number, c: string) => formatMoney({ amount: m, currency: c }, "en");
  return (
    <>
      <h1 className={ui.pageTitle}>Search departures</h1>
      <form method="get" aria-label="Search departures">
        <div className={ui.grid}>
          <Input label="From" name="from" type="date" required defaultValue={from || today} />
          <Input label="To" name="to" type="date" required defaultValue={to} />
          <Select
            label="Route"
            name="route"
            placeholder="Any route"
            defaultValue={q.route}
            options={routes.map((r) => ({ value: `${r.origin}→${r.destination}`, label: `${r.origin} → ${r.destination}` }))}
          />
          <Input label="Nights" name="nights" inputMode="numeric" defaultValue={q.nights} hint="Leave empty for any length." />
          <Input label="Adults in the cabin" name="adults" inputMode="numeric" defaultValue={String(adults)} hint="1 to 3." />
          <Input
            label="Children's ages"
            name="children"
            defaultValue={q.children}
            hint="For example “7, 4”. Under 3s travel free."
          />
        </div>
        <div className={ui.filterSubmit}>
          <Button type="submit">Search</Button>
        </div>
      </form>
      {problem ? <Notice tone="error">{problem}</Notice> : null}
      {results ? (
        <Section title={`${results.length} ${results.length === 1 ? "departure" : "departures"}`} id="results">
          <p className={ui.muted}>
            Prices are for one cabin with these guests. The crew gratuity is paid on board and not included.
          </p>
          {results.map((d) => (
            <article key={d.departureId} className={ui.card} aria-label={`${d.vessel}, ${d.departsOn}`}>
              <h3 className={ui.subTitle}>
                {d.vessel} · {d.route}, {d.nights} nights
              </h3>
              <p className={ui.muted}>
                {d.departsOn} to {d.returnsOn}
                {d.sailingPeriod
                  ? ` · ${sailingTimeText(d.sailingPeriod as SailingPeriod, d.sailsAt, d.route.split(" → ")[0]!)}`
                  : ""}
              </p>
              <ul className={ui.list}>
                {d.cabins.map((c) => (
                  <li key={`${c.cabinTypeId}-${c.currency}`}>
                    {c.name}, {c.deck} deck · {c.available} {c.available === 1 ? "cabin" : "cabins"} left ·{" "}
                    {c.price.ok ? (
                      <>
                        <strong>{money(c.price.totalMinor, c.currency)}</strong>{" "}
                        <span className={ui.muted}>({TIER_LABEL[c.price.tier]})</span> ·{" "}
                        <Link
                          href={`/dashboard/partner/${orgId}/reserve/?dep=${d.departureId}&cabin=${c.cabinTypeId}&cur=${c.currency}&adults=${adults}&children=${encodeURIComponent(q.children ?? "")}`}
                        >
                          Reserve
                        </Link>
                      </>
                    ) : (
                      <span className={ui.muted}>{c.price.reason}</span>
                    )}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </Section>
      ) : null}
    </>
  );
}
