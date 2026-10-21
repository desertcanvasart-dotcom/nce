import Link from "next/link";
import { Badge } from "@/components/ds/Badge/Badge";
import { ActionForm } from "@/components/dashboard/ActionForm";
import { Notice, Section, ui } from "@/components/dashboard/ui";
import { requireUser } from "@/server/auth";
import { myRequests, routeOptions } from "@/server/bookings/queries";
import { myBookingRequests, REQUEST_STATUS } from "@/server/requests/queries";
import { requestDefaults } from "@/lib/marketplace/vessel";
import { SavedPlan } from "@/components/plan/SavedPlan";
import { RequestFields } from "../../_bookings/RequestFields";
import { createRequest } from "../actions";

const STATUS = {
  open: { tone: "success", text: "Open for offers" },
  accepted: { tone: "accent", text: "Offer accepted" },
  closed: { tone: "neutral", text: "Closed" },
} as const;

const PLAN_KEYS = new Set([
  "route",
  "from",
  "to",
  "nights",
  "nmin",
  "nmax",
  "adults",
  "children",
  "cabins",
  "budget",
  "cur",
  "notes",
]);

/** DASH-CUS-004, 014, 015, DASH-CUS-002 (ADR-091): ask operators for offers and follow each request with its offers. */
export default async function MyRequests({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  // A plan from Plan my cruise comes in the address; it survives the sign-in (DASH-PUB-007).
  const sp = await searchParams;
  const planned = Object.entries(sp).filter((e): e is [string, string] => PLAN_KEYS.has(e[0]) && typeof e[1] === "string");
  const back = planned.length ? `?${new URLSearchParams(planned).toString()}#new` : "";
  const session = await requireUser(`/dashboard/journey/requests/${back}`);
  const [requests, routes, booking] = await Promise.all([myRequests(), routeOptions(), myBookingRequests(session.userId)]);
  const defaults = requestDefaults(sp, routes);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });

  return (
    <>
      <h1 className={ui.pageTitle}>Requests and offers</h1>
      <p>
        <Link href="/dashboard/journey/offers/">All offers you have received</Link>
      </p>
      {/* Only Plan my cruise sends a range of nights; a vessel page's link leaves a saved plan alone. */}
      <SavedPlan today={today} handedOver={"nmin" in sp} />
      <Notice>
        A request asks operators for personal offers. Operators whose cruises fit can reply, and you choose. It isn’t an auction:
        no offer and no lowest price is guaranteed.
      </Notice>

      {booking.length ? (
        <Section title="Booking requests" id="booking">
          <p className={ui.muted}>Cabins you asked to book; the operator confirms they exist before you pay.</p>
          <ul className={ui.list}>
            {booking.map((b) => (
              <li key={b.id}>
                <Link href={`/dashboard/journey/requests/booking/${b.id}/`}>{b.reference}</Link> · {b.vessel?.name} ·{" "}
                {b.departure?.departs_on} <Badge tone={REQUEST_STATUS[b.status]!.tone}>{REQUEST_STATUS[b.status]!.text}</Badge>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section title="Your requests" id="mine">
        {requests.length ? (
          <ul className={ui.list}>
            {requests.map((r) => (
              <li key={r.id}>
                <Link href={`/dashboard/journey/requests/${r.id}/`}>
                  {r.origin && r.destination ? `${r.origin} → ${r.destination}` : "Flexible route"}, {r.earliest_departure} to{" "}
                  {r.latest_departure}
                </Link>{" "}
                <Badge tone={STATUS[r.status].tone}>{STATUS[r.status].text}</Badge>{" "}
                <span className={ui.muted}>
                  {r.offers.length} offer{r.offers.length === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={ui.muted}>No requests yet.</p>
        )}
      </Section>

      <Section title="Ask for offers" id="new">
        <ActionForm action={createRequest} submit="Send request">
          <RequestFields routes={routes} defaults={defaults} />
          <p className={ui.muted}>
            Operators see your trip and the guests’ ages, not your name or contact details, until you accept an offer.
          </p>
        </ActionForm>
      </Section>
    </>
  );
}
