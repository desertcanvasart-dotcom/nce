import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ds/Badge/Badge";
import { formatMoney } from "@/components/ds/lib/format";
import { ActionForm } from "@/components/dashboard/ActionForm";
import { Section, ui } from "@/components/dashboard/ui";
import { CairoTime } from "@/components/shell/CairoTime";
import { requireOrgRole } from "@/server/auth";
import { getDb } from "@/server/db";
import { bookingRequest, REQUEST_STATUS } from "@/server/requests/queries";
import { partnerAcceptAlternative, partnerWithdrawRequest } from "../../../../../_requests/actions";
import { isUuid } from "../../../../../sections";

/** ADR-100: a travel partner's booking request: waiting, held, confirmed (then pay), declined, or another offer to take. */
export default async function PartnerBookingRequest({ params }: { params: Promise<{ orgId: string; id: string }> }) {
  const { orgId, id } = await params;
  if (!isUuid(orgId) || !isUuid(id)) notFound();
  const { company } = await requireOrgRole(orgId, ["owner", "reservations", "finance"], {
    kind: "partner",
    allowPaused: true,
    returnTo: `/dashboard/partner/${orgId}/requests/booking/${id}/`,
  });
  const r = await bookingRequest(id);
  const db = await getDb();
  const { data: own } = await db.from("booking_requests").select("buyer_org_id, client_reference").eq("id", id).maybeSingle();
  if (!r || own?.buyer_org_id !== orgId) notFound();
  const canAct = company.teamRole === "owner" || company.teamRole === "reservations";
  const st = REQUEST_STATUS[r.status]!;
  const s = r.summary;
  return (
    <>
      <p>
        <Link href={`/dashboard/partner/${orgId}/requests/`}>← Requests and offers</Link>
      </p>
      <h1 className={ui.pageTitle}>Booking request {s.reference}</h1>
      <p className={ui.actions}>
        <Badge tone={st.tone}>{st.text}</Badge>
        <span className={ui.muted}>
          Sent <CairoTime value={r.created_at} />
          {own.client_reference ? ` · client reference ${own.client_reference}` : ""}
        </span>
      </p>
      <ul className={ui.list}>
        <li>
          {s.vessel}: {s.origin} to {s.destination}, {s.departsOn}, {s.nights} nights
        </li>
        <li>{s.lines.map((l) => `${l.count} × ${l.cabin}`).join(", ")}</li>
        <li>
          {s.guests} guests · {formatMoney({ amount: Number(r.total_minor), currency: r.currency }, "en")} at your rate
        </li>
      </ul>
      {r.status === "waiting" ? <p>The operator confirms the cabins exist before you pay. You’ll see the answer here.</p> : null}
      {r.status === "held" && r.hold_until ? (
        <p>
          The operator is holding the cabins until <CairoTime value={r.hold_until} /> while they confirm.
        </p>
      ) : null}
      {r.status === "confirmed" && r.reservation_id ? (
        <p>
          Confirmed. <Link href={`/dashboard/partner/${orgId}/bookings/${r.reservation_id}/`}>Open the booking</Link> to pay by
          its deadline.
        </p>
      ) : null}
      {r.status === "declined" ? (
        <p>
          The operator can’t offer these cabins. <Link href={`/dashboard/partner/${orgId}/search/`}>Search other departures</Link>
          .
        </p>
      ) : null}
      {r.status === "expired" ? <p>The operator didn’t confirm in time, so nothing was booked.</p> : null}
      {r.status === "alternative_offered" && r.alternative ? (
        <Section title="The operator offers instead" id="alternative">
          <ul className={ui.list}>
            {r.alternative.departsOn ? <li>Date: {r.alternative.departsOn}</li> : null}
            {r.alternative.cabin ? <li>Cabin type: {r.alternative.cabin}</li> : null}
            <li>Cabins: {r.alternative.cabins}</li>
            {r.alternative.note ? <li>Note: {r.alternative.note}</li> : null}
          </ul>
          {canAct ? (
            <ActionForm action={partnerAcceptAlternative.bind(null, orgId, id)} submit="Book this instead">
              <p className={ui.muted}>The guests stay the same; the price is your rate for this date and cabin type.</p>
            </ActionForm>
          ) : null}
        </Section>
      ) : null}
      {canAct && ["waiting", "held", "alternative_offered"].includes(r.status) ? (
        <ActionForm action={partnerWithdrawRequest.bind(null, orgId, id)} submit="Withdraw this request" variant="ghost">
          {null}
        </ActionForm>
      ) : null}
    </>
  );
}
