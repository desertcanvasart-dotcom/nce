import Link from "next/link";
import { Badge } from "@/components/ds/Badge/Badge";
import { Button } from "@/components/ds/Button/Button";
import { formatMoney } from "@/components/ds/lib/format";
import { Input, Section, Select, ui } from "@/components/dashboard/ui";
import { offerView } from "@/lib/bookings/bookings";
import { nowMs } from "@/lib/product/departures";
import { requireAdmin } from "@/server/auth";
import { routeOptions, searchBookings } from "@/server/bookings/queries";
import { approvedOperators } from "@/server/catalogue/queries";
import { guestsText, OFFER_BADGE } from "../../_bookings/OfferSummary";
import { RESERVATION_BADGE } from "../../_bookings/ReservationRecord";

type Props = { searchParams: Promise<{ q?: string; operator?: string; route?: string; from?: string; to?: string }> };
const money = (minor: number, currency: string) => formatMoney({ amount: Number(minor), currency }, "en");
const DAY = 86_400_000;

/** DASH-ADM-090–096: every request, offer and reservation; search; incomplete transactions. */
export default async function AdminBookings({ searchParams }: Props) {
  await requireAdmin(["finance"], "/dashboard/admin/bookings/");
  const sp = await searchParams;
  const clean = (v?: string) => (v && v.length <= 80 ? v : undefined);
  const filter = { q: clean(sp.q), operator: clean(sp.operator), route: clean(sp.route), from: clean(sp.from), to: clean(sp.to) };
  const [found, operators, routes] = await Promise.all([searchBookings(filter), approvedOperators(), routeOptions()]);
  const now = nowMs();
  const unanswered = found.requests.filter(
    (r) =>
      r.status === "open" &&
      ((r.offers as unknown as { count: number }[])[0]?.count ?? 0) === 0 &&
      now - Date.parse(r.created_at) > 3 * DAY,
  );
  const awaiting = found.reservations.filter((r) => r.status === "awaiting_payment");

  return (
    <>
      <h1 className={ui.pageTitle}>Requests and bookings</h1>
      <form method="get" className={ui.grid} aria-label="Search bookings">
        <Input label="Booking reference" name="q" defaultValue={filter.q} hint="For example NC-7K3QX9." />
        <Select
          label="Operator"
          name="operator"
          placeholder="All"
          defaultValue={filter.operator}
          options={operators.map((o) => ({ value: o.id, label: o.display_name }))}
        />
        <Select
          label="Route"
          name="route"
          placeholder="All"
          defaultValue={filter.route}
          options={routes.map((r) => ({ value: `${r.origin}→${r.destination}`, label: `${r.origin} → ${r.destination}` }))}
        />
        <Input label="Departing from" name="from" type="date" defaultValue={filter.from} />
        <Input label="Departing to" name="to" type="date" defaultValue={filter.to} />
        <div className={ui.filterSubmit}>
          <Button type="submit">Search</Button>
        </div>
      </form>

      <Section title="Incomplete transactions" id="incomplete">
        <p className={ui.muted}>Reservations not yet paid, and requests with no offer after three days.</p>
        <ul className={ui.list}>
          {awaiting.map((r) => (
            <li key={r.id}>
              <Link href={`/dashboard/admin/bookings/${r.id}/`}>{r.reference}</Link> · awaiting payment · {r.org?.display_name}
            </li>
          ))}
          {unanswered.map((r) => (
            <li key={r.id}>
              Request {r.origin && r.destination ? `${r.origin} → ${r.destination}` : "flexible route"}, {r.earliest_departure} to{" "}
              {r.latest_departure} · {guestsText(r.adults, r.child_ages)} · no offers yet
            </li>
          ))}
          {!awaiting.length && !unanswered.length ? <li className={ui.muted}>Nothing incomplete.</li> : null}
        </ul>
      </Section>

      <Section title={`Reservations (${found.reservations.length})`} id="reservations">
        {found.reservations.length ? (
          <div className={ui.tableWrap}>
            <table className={`${ui.table} ${ui.stack}`}>
              <caption className="visually-hidden">Reservations</caption>
              <thead>
                <tr>
                  <th scope="col">Reference</th>
                  <th scope="col">Operator</th>
                  <th scope="col">Sailing</th>
                  <th scope="col">Status</th>
                  <th scope="col" className={ui.num}>
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {found.reservations.map((r) => (
                  <tr key={r.id}>
                    <th scope="row" data-label="Reference">
                      <Link href={`/dashboard/admin/bookings/${r.id}/`}>{r.reference}</Link>
                    </th>
                    <td data-label="Operator">{r.org?.display_name}</td>
                    <td data-label="Sailing">
                      {r.vessel?.name} · {r.departure?.departs_on} · {r.departure?.schedule?.origin} →{" "}
                      {r.departure?.schedule?.destination}
                    </td>
                    <td data-label="Status">
                      <Badge tone={RESERVATION_BADGE[r.status].tone}>{RESERVATION_BADGE[r.status].text}</Badge>
                    </td>
                    <td data-label="Total" className={ui.num}>
                      {money(r.total_minor, r.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={ui.muted}>No reservations match.</p>
        )}
      </Section>

      <Section title={`Offers (${found.offers.length})`} id="offers">
        {found.offers.length ? (
          <ul className={ui.list}>
            {found.offers.map((o) => {
              const v = offerView(o, now);
              return (
                <li key={o.id}>
                  {o.org?.display_name} · departs {o.departure?.departs_on} · version {o.version} ·{" "}
                  {money(o.total_minor, o.currency)} <Badge tone={OFFER_BADGE[v].tone}>{OFFER_BADGE[v].text}</Badge>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className={ui.muted}>No offers yet.</p>
        )}
      </Section>

      <Section title={`Requests (${found.requests.length})`} id="requests">
        {found.requests.length ? (
          <ul className={ui.list}>
            {found.requests.map((r) => (
              <li key={r.id}>
                {r.origin && r.destination ? `${r.origin} → ${r.destination}` : "Flexible route"}, {r.earliest_departure} to{" "}
                {r.latest_departure} · {guestsText(r.adults, r.child_ages)} · {r.status} ·{" "}
                {(r.offers as unknown as { count: number }[])[0]?.count ?? 0} offers
              </li>
            ))}
          </ul>
        ) : (
          <p className={ui.muted}>No requests yet.</p>
        )}
      </Section>
    </>
  );
}
