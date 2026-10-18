import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/dashboard/ActionForm";
import { Input, Section, Select, ui } from "@/components/dashboard/ui";
import { requireOrgRole } from "@/server/auth";
import { reservation } from "@/server/bookings/queries";
import { ReservationRecord } from "../../../../_bookings/ReservationRecord";
import { isUuid } from "../../../../sections";
import { reviewProof } from "../../offers/actions";

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

  return (
    <>
      <p>
        <Link href={`/dashboard/operator/${orgId}/bookings/`}>← Bookings</Link>
      </p>
      <h1 className={ui.pageTitle}>Reservation {r.reference}</h1>
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
