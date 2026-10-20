import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ds/Badge/Badge";
import { formatMoney } from "@/components/ds/lib/format";
import { ActionForm } from "@/components/dashboard/ActionForm";
import { Section, ui } from "@/components/dashboard/ui";
import { CairoTime } from "@/components/shell/CairoTime";
import { requireUser } from "@/server/auth";
import { bookingRequest, REQUEST_STATUS } from "@/server/requests/queries";
import { acceptAlternative, withdrawRequest } from "../../../../_requests/actions";
import { isUuid } from "../../../../sections";

/** ADR-099: the customer's booking request: waiting, held, confirmed (then pay), declined, or another offer to take. */
export default async function MyBookingRequest({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const session = await requireUser(`/dashboard/journey/requests/booking/${id}/`);
  const r = await bookingRequest(id);
  if (!r || r.customer_id !== session.userId) notFound();
  const st = REQUEST_STATUS[r.status]!;
  const s = r.summary;
  return (
    <>
      <p>
        <Link href="/dashboard/journey/requests/">← Requests and offers</Link>
      </p>
      <h1 className={ui.pageTitle}>Booking request {s.reference}</h1>
      <p className={ui.actions}>
        <Badge tone={st.tone}>{st.text}</Badge>
        <span className={ui.muted}>
          Sent <CairoTime value={r.created_at} />
        </span>
      </p>
      <ul className={ui.list}>
        <li>
          {s.vessel}: {s.origin} to {s.destination}, {s.departsOn}, {s.nights} nights
        </li>
        <li>{s.lines.map((l) => `${l.count} × ${l.cabin}`).join(", ")}</li>
        <li>
          {s.guests} guests · {formatMoney({ amount: Number(r.total_minor), currency: r.currency }, "en")} at the published rate
        </li>
      </ul>
      {r.status === "waiting" ? (
        <p>The operator confirms the cabins exist before you pay. We’ll tell you as soon as they answer.</p>
      ) : null}
      {r.status === "held" && r.hold_until ? (
        <p>
          The operator is holding your cabins until <CairoTime value={r.hold_until} /> while they confirm.
        </p>
      ) : null}
      {r.status === "confirmed" && r.reservation_id ? (
        <p>
          Confirmed. <Link href={`/dashboard/journey/reservations/${r.reservation_id}/`}>Open your reservation and pay</Link>.
        </p>
      ) : null}
      {r.status === "declined" ? (
        <p>
          The operator can’t offer these cabins. <Link href="/cruises/">See other dates and ships</Link>.
        </p>
      ) : null}
      {r.status === "expired" ? (
        <p>The operator didn’t confirm in time, so nothing was booked. You can send a new request.</p>
      ) : null}
      {r.status === "alternative_offered" && r.alternative ? (
        <Section title="The operator offers instead" id="alternative">
          <ul className={ui.list}>
            {r.alternative.departsOn ? <li>Date: {r.alternative.departsOn}</li> : null}
            {r.alternative.cabin ? <li>Cabin type: {r.alternative.cabin}</li> : null}
            <li>Cabins: {r.alternative.cabins}</li>
            {r.alternative.note ? <li>Note: {r.alternative.note}</li> : null}
          </ul>
          <ActionForm action={acceptAlternative.bind(null, id)} submit="Book this instead">
            <p className={ui.muted}>Your guests stay the same; the price is the published rate for this date and cabin type.</p>
          </ActionForm>
        </Section>
      ) : null}
      {["waiting", "held", "alternative_offered"].includes(r.status) ? (
        <ActionForm action={withdrawRequest.bind(null, id)} submit="Withdraw this request" variant="ghost">
          {null}
        </ActionForm>
      ) : null}
    </>
  );
}
