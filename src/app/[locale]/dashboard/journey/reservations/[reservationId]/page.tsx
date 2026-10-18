import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/dashboard/ActionForm";
import { Notice, Section, ui } from "@/components/dashboard/ui";
import { requireUser } from "@/server/auth";
import { reservation } from "@/server/bookings/queries";
import { ReservationRecord } from "../../../_bookings/ReservationRecord";
import { isUuid } from "../../../sections";
import { uploadProof } from "../../actions";

const PROOF = {
  submitted: "Waiting for the operator’s check",
  verified: "Verified by the operator",
  rejected: "Not accepted",
} as const;

/** One reservation for its customer, with the eligibility proof upload for local rates (ADR-078, ADR-088). */
export default async function MyReservation({ params }: { params: Promise<{ reservationId: string }> }) {
  const { reservationId } = await params;
  if (!isUuid(reservationId)) notFound();
  const session = await requireUser(`/dashboard/journey/reservations/${reservationId}/`);
  const r = await reservation(reservationId);
  if (!r || r.customer_id !== session.userId) notFound();
  const local = r.rate_plan === "egyptian_citizen" || r.rate_plan === "foreign_resident";

  return (
    <>
      <p>
        <Link href="/dashboard/journey/reservations/">← Reservations</Link>
      </p>
      <h1 className={ui.pageTitle}>Reservation {r.reference}</h1>
      <ReservationRecord r={r} />
      {local ? (
        <Section title="Proof of eligibility" id="proof">
          {/* CONTENT-NEEDED #38: Faris's wording replaces this draft. */}
          <Notice>
            Draft wording: this reservation uses the{" "}
            {r.rate_plan === "egyptian_citizen" ? "Egyptian-citizen" : "foreign-resident"} rate. Upload proof (for example an ID
            card or residence permit). Only you, the operator and Nilecruz can open it.
          </Notice>
          {r.eligibility_proofs.length ? (
            <ul className={ui.list}>
              {r.eligibility_proofs.map((p) => (
                <li key={p.id}>
                  {p.url ? <a href={p.url}>Uploaded file</a> : "Uploaded file"} · {PROOF[p.status]}
                  {p.note ? ` · ${p.note}` : ""}
                </li>
              ))}
            </ul>
          ) : null}
          <ActionForm
            action={uploadProof.bind(null, r.id)}
            submit="Upload proof"
            encType="multipart/form-data"
            resetOnSuccess
            variant="outline"
          >
            <div className={ui.field}>
              <label className={ui.label} htmlFor="proof">
                File (PDF, JPEG or PNG, up to 10 MB)
              </label>
              <input id="proof" name="proof" type="file" accept="application/pdf,image/jpeg,image/png" required />
            </div>
          </ActionForm>
        </Section>
      ) : null}
    </>
  );
}
