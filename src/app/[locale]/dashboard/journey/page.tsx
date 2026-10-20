import Link from "next/link";
import { Badge } from "@/components/ds/Badge/Badge";
import { Section, ui } from "@/components/dashboard/ui";
import { CairoTime } from "@/components/shell/CairoTime";
import { requireUser } from "@/server/auth";
import { notices } from "@/server/bookings/queries";
import { journey } from "@/server/journey/queries";
import { Notices } from "../_bookings/Notices";
import { RESERVATION_BADGE } from "../_bookings/ReservationRecord";
import { SailingTime } from "../_bookings/SailingTime";
import { TOUR_ORDER_BADGE } from "../_bookings/TourOrderBits";
import { markNoticesRead } from "./actions";

/** Overview (DASH-CUS-001, 003): the next trip, what needs doing, what is coming up, and notices. */
export default async function JourneyHome() {
  const session = await requireUser("/dashboard/journey/");
  const inCompany = session.memberships.some((m) => m.kind === "operator");
  const [j, items] = await Promise.all([journey(session.userId), notices({ userId: session.userId })]);
  const next = j.next?.reservation;
  return (
    <>
      <h1 className={ui.pageTitle}>My journey</h1>
      <p className={ui.muted}>Your requests, offers, bookings and tours, in one place.</p>

      <Section title="Needs your attention" id="actions">
        {j.actions.length ? (
          <ul className={ui.list}>
            {j.actions.map((a) => (
              <li key={`${a.kind}-${a.href}`}>
                {a.waiting ? <span>{a.title}</span> : <Link href={a.href}>{a.title}</Link>}
                {a.due ? (
                  <span className={ui.muted}>
                    {" "}
                    · {a.kind === "offers" ? "first one expires" : "by"}{" "}
                    {/* Reservation deadlines fall at Cairo midnight: shown as the last day (ADR-027). */}
                    <CairoTime value={a.due} endOfDay={a.kind === "pay" || a.kind === "proof"} />
                  </span>
                ) : null}
                {a.waiting ? (
                  <span className={ui.muted}>
                    {" "}
                    · nothing to do; <Link href={a.href}>see it</Link>
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className={ui.muted}>Nothing needs doing right now.</p>
        )}
      </Section>

      <Section title="Next trip" id="next">
        {next ? (
          <>
            <p>
              <Link href={`/dashboard/journey/reservations/${next.id}/`}>
                {next.vessel}: {next.route}
              </Link>{" "}
              <Badge tone={RESERVATION_BADGE[next.status].tone}>{RESERVATION_BADGE[next.status].text}</Badge>
            </p>
            <p className={ui.muted}>
              {next.departsOn} to {next.returnsOn} · reservation {next.reference}
            </p>
            <SailingTime
              schedule={
                next.origin
                  ? { origin: next.origin, sailing_period: next.sailingPeriod ?? null, sails_at: next.sailsAt ?? null }
                  : null
              }
            />
            {j.next!.tours.length ? (
              <ul className={ui.list}>
                {j.next!.tours.map((o) => (
                  <li key={o.id}>
                    <Link href={`/dashboard/journey/tours/${o.id}/`}>{o.tourName}</Link> · <CairoTime value={o.startsAt} />
                  </li>
                ))}
              </ul>
            ) : (
              <p>
                <Link href="/dashboard/journey/tours/">Add tours and sightseeing for this trip</Link>
              </p>
            )}
          </>
        ) : (
          <p className={ui.muted}>
            No trip booked yet. <Link href="/dashboard/journey/requests/">Ask operators for offers</Link>.
          </p>
        )}
      </Section>

      <Section title="Coming up" id="upcoming">
        {j.upcoming.length ? (
          <ul className={ui.list}>
            {j.upcoming.map((u) => (
              <li key={`${u.kind}-${u.id}`}>
                {u.date} · <Link href={u.href}>{u.title}</Link>{" "}
                {u.kind === "cruise" ? (
                  <Badge tone={RESERVATION_BADGE[u.status as keyof typeof RESERVATION_BADGE].tone}>
                    {RESERVATION_BADGE[u.status as keyof typeof RESERVATION_BADGE].text}
                  </Badge>
                ) : (
                  <Badge tone={TOUR_ORDER_BADGE[u.status as keyof typeof TOUR_ORDER_BADGE].tone}>
                    {TOUR_ORDER_BADGE[u.status as keyof typeof TOUR_ORDER_BADGE].text}
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className={ui.muted}>Nothing coming up.</p>
        )}
      </Section>

      <Notices items={items} markRead={markNoticesRead} />
      {inCompany || session.platformRole === "admin" ? null : (
        <p>
          <Link href="/account/apply-operator/">Run a cruise company? Apply as an operator</Link>
          {" · "}
          <Link href="/account/apply-partner/">A travel agency? Apply for trade access</Link>
        </p>
      )}
    </>
  );
}
