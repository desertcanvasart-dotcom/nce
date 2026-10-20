import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/dashboard/ActionForm";
import { Input, Section, Select, ui } from "@/components/dashboard/ui";
import { requireOrgRole } from "@/server/auth";
import { reservation } from "@/server/bookings/queries";
import { ReservationRecord } from "../../../../_bookings/ReservationRecord";
import { isUuid } from "../../../../sections";
import { reviewCancellation, reviewProof, sendReminder } from "../../offers/actions";
import { balance, cancellationsFor, paymentsFor, refundsFor } from "@/server/payments/queries";
import { CancellationPanel } from "../../../../_bookings/CancellationPanel";
import { PaymentPanel } from "../../../../_bookings/PaymentPanel";

const PROOF = { submitted: "Waiting for your check", verified: "Verified", rejected: "Not accepted" } as const;

/** One reservation for the operator: the booking record, guests (SEC-013) and eligibility proof (ADR-078). */
export default async function OperatorBooking({ params }: { params: Promise<{ orgId: string; reservationId: string }> }) {
  const { orgId, reservationId } = await params;
  if (!isUuid(orgId) || !isUuid(reservationId)) notFound();
  const { company } = await requireOrgRole(orgId, ["owner", "reservations", "finance", "viewer"], {
    kind: "operator",
    returnTo: `/dashboard/operator/${orgId}/bookings/${reservationId}/`,
  });
  const r = await reservation(reservationId);
  if (!r || r.org_id !== orgId) notFound();
  const canReview = company.teamRole === "owner" || company.teamRole === "reservations";
  const local = r.rate_plan === "egyptian_citizen" || r.rate_plan === "foreign_resident";
  const [bal, pays, requests, refunds] = await Promise.all([
    balance(r.id),
    paymentsFor(r.id),
    cancellationsFor(r.id),
    refundsFor(r.id),
  ]);
  const canRemind = company.teamRole !== "viewer";

  return (
    <>
      <p>
        <Link href={`/dashboard/operator/${orgId}/bookings/`}>← Bookings</Link>
      </p>
      <h1 className={ui.pageTitle}>Reservation {r.reference}</h1>
      {r.buyer_name ? <p className={ui.muted}>Trade booking for {r.buyer_name}, a Nilecruz travel partner.</p> : null}
      {bal ? <PaymentPanel bal={bal} pays={pays} rule={r.deadline_rule} status={r.status} /> : null}
      {canRemind && r.status === "awaiting_payment" ? (
        <ActionForm
          action={sendReminder.bind(null, orgId, r.id)}
          submit="Send the customer a payment reminder"
          variant="outline"
        />
      ) : null}
      <p className={ui.muted}>Payments are received and recorded by Nilecruz; you see their status here.</p>
      <CancellationPanel
        requests={requests}
        refunds={refunds}
        actions={(c) =>
          canRemind && c.status === "requested" && c.operator_review === "pending" ? (
            <ActionForm action={reviewCancellation.bind(null, orgId, r.id, c.id)} submit="Send to Nilecruz" variant="outline">
              <div className={ui.grid}>
                <Select
                  label="Are the figures right?"
                  name="verdict"
                  required
                  placeholder="Choose"
                  options={[
                    { value: "confirmed", label: "Yes, confirm them" },
                    { value: "contested", label: "No, contest them" },
                  ]}
                />
                <Input label="Note to Nilecruz" name="note" maxLength={1000} hint="Required when contesting." />
              </div>
            </ActionForm>
          ) : null
        }
      />
      <ReservationRecord r={r} />
      {local ? (
        <Section title="Proof of eligibility" id="proof">
          <p className={ui.muted}>
            Check the proof before payment is due. If the customer isn’t eligible, send an updated offer at the right rate.
          </p>
          {r.eligibility_proofs.length ? (
            <ul className={ui.list}>
              {r.eligibility_proofs.map((p) => (
                <li key={p.id}>
                  {p.url ? <a href={p.url}>Open the file</a> : "File"} · {PROOF[p.status]}
                  {p.note ? ` · ${p.note}` : ""}
                  {canReview && p.status === "submitted" ? (
                    <ActionForm action={reviewProof.bind(null, orgId, r.id, p.id)} submit="Save check" variant="outline">
                      <div className={ui.grid}>
                        <Select
                          label="Result"
                          name="decision"
                          required
                          placeholder="Choose"
                          options={[
                            { value: "verified", label: "Verified" },
                            { value: "rejected", label: "Not accepted" },
                          ]}
                        />
                        <Input label="Note to the customer" name="note" maxLength={500} hint="Required if not accepted." />
                      </div>
                    </ActionForm>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className={ui.muted}>The customer hasn’t uploaded proof yet.</p>
          )}
        </Section>
      ) : null}
    </>
  );
}
