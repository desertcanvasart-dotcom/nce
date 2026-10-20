import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ds/Badge/Badge";
import { ActionForm } from "@/components/dashboard/ActionForm";
import { Input, Section, Select, TextArea, ui } from "@/components/dashboard/ui";
import { CairoTime } from "@/components/shell/CairoTime";
import { requireOrgRole } from "@/server/auth";
import { getDb } from "@/server/db";
import { bookingRequest, REQUEST_STATUS } from "@/server/requests/queries";
import { answerInDashboard } from "../../../../../_requests/actions";
import { RequestFacts } from "../../../../../_requests/Bits";
import { isUuid } from "../../../../../sections";

/** ADR-099: one booking request in the operator's dashboard, answered the same four ways as the email links. */
export default async function OperatorBookingRequest({ params }: { params: Promise<{ orgId: string; id: string }> }) {
  const { orgId, id } = await params;
  if (!isUuid(orgId) || !isUuid(id)) notFound();
  const { company } = await requireOrgRole(orgId, ["owner", "reservations", "finance", "viewer"], {
    kind: "operator",
    returnTo: `/dashboard/operator/${orgId}/requests/booking/${id}/`,
  });
  const r = await bookingRequest(id);
  if (!r || r.org_id !== orgId) notFound();
  const canAnswer = ["owner", "reservations"].includes(company.teamRole) && ["waiting", "held"].includes(r.status);
  const db = await getDb();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });
  const [{ data: sailings }, { data: cabins }] = canAnswer
    ? await Promise.all([
        db
          .from("departures")
          .select("id, departs_on")
          .eq("vessel_id", r.vessel_id)
          .eq("status", "scheduled")
          .gt("departs_on", today)
          .order("departs_on")
          .limit(60),
        db.from("cabin_types").select("id, name").eq("vessel_id", r.vessel_id).eq("active", true).order("name"),
      ])
    : [{ data: [] }, { data: [] }];
  const st = REQUEST_STATUS[r.status]!;
  return (
    <>
      <p>
        <Link href={`/dashboard/operator/${orgId}/offers/`}>← Requests and offers</Link>
      </p>
      <h1 className={ui.pageTitle}>Booking request {r.summary.reference}</h1>
      <p className={ui.actions}>
        <Badge tone={st.tone}>{st.text}</Badge>
        <span className={ui.muted}>
          Asked <CairoTime value={r.created_at} />
          {r.responded_at ? (
            <>
              {" "}
              · first answered <CairoTime value={r.responded_at} />
            </>
          ) : null}
          {r.hold_until ? (
            <>
              {" "}
              · held until <CairoTime value={r.hold_until} />
            </>
          ) : null}
        </span>
      </p>
      <RequestFacts summary={r.summary} />
      {r.reservation_id ? (
        <p>
          <Link href={`/dashboard/operator/${orgId}/bookings/${r.reservation_id}/`}>Open the booking</Link>, with the guests’
          names.
        </p>
      ) : null}
      {canAnswer ? (
        <Section title="Answer" id="answer">
          <div className={ui.actions}>
            <ActionForm action={answerInDashboard.bind(null, orgId, id, "confirm")} submit="Confirm">
              {null}
            </ActionForm>
            <ActionForm action={answerInDashboard.bind(null, orgId, id, "decline")} submit="Decline" variant="outline">
              {null}
            </ActionForm>
            {r.status === "waiting" ? (
              <ActionForm action={answerInDashboard.bind(null, orgId, id, "hold")} submit="Hold 72h" variant="outline">
                {null}
              </ActionForm>
            ) : null}
          </div>
          <h3 className={ui.subTitle}>Offer other</h3>
          <ActionForm action={answerInDashboard.bind(null, orgId, id, "other")} submit="Send this offer" variant="outline">
            <div className={ui.grid}>
              <Select
                label="Another date"
                name="departure_id"
                placeholder="Same date"
                options={(sailings ?? []).map((s) => ({ value: s.id, label: s.departs_on }))}
              />
              <Select
                label="Another cabin type"
                name="cabin_type_id"
                placeholder="Same cabin type"
                options={(cabins ?? []).map((c) => ({ value: c.id, label: c.name }))}
              />
              <Input
                label="Number of cabins"
                name="cabins"
                type="number"
                min={1}
                max={5}
                required
                defaultValue={r.summary.lines.reduce((n, l) => n + l.count, 0)}
              />
            </div>
            <TextArea label="Short note for the customer" name="note" rows={2} maxLength={500} />
          </ActionForm>
        </Section>
      ) : null}
    </>
  );
}
