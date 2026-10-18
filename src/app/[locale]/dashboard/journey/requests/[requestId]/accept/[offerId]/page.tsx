import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/dashboard/ActionForm";
import { Checkboxes, Input, Notice, Section, ui } from "@/components/dashboard/ui";
import { canAccept } from "@/lib/bookings/bookings";
import { nowMs } from "@/lib/product/departures";
import type { CancellationBand } from "@/lib/tours/tours";
import { requireUser } from "@/server/auth";
import { offer, policyFor, request } from "@/server/bookings/queries";
import { OfferSummary } from "../../../../../_bookings/OfferSummary";
import { isUuid } from "../../../../../sections";
import { acceptOffer } from "../../../../actions";

type Props = { params: Promise<{ requestId: string; offerId: string }> };

/** DASH-CUS-007, ADR-088: read the terms and the cancellation policy, name every guest, accept. */
export default async function AcceptOffer({ params }: Props) {
  const { requestId, offerId } = await params;
  if (!isUuid(requestId) || !isUuid(offerId)) notFound();
  const session = await requireUser(`/dashboard/journey/requests/${requestId}/accept/${offerId}/`);
  const [r, o] = await Promise.all([request(requestId), offer(offerId)]);
  if (!r || !o || r.customer_id !== session.userId || o.request_id !== r.id) notFound();
  const now = nowMs();
  const policy = o.departure ? await policyFor(o.departure.id) : null;
  const terms = (l: string) => policy?.cancellation_policy_translations.find((t) => t.locale === l)?.terms;
  const offered = {
    adults: o.offer_cabins.reduce((n, c) => n + c.adults, 0),
    childAges: o.offer_cabins.flatMap((c) => c.child_ages),
  };
  const total = offered.adults + offered.childAges.length;
  const local = o.rate_plan === "egyptian_citizen" || o.rate_plan === "foreign_resident";

  return (
    <>
      <p>
        <Link href={`/dashboard/journey/requests/${r.id}/`}>← Back to the offers</Link>
      </p>
      <h1 className={ui.pageTitle}>Accept this offer</h1>
      <OfferSummary o={o} now={now} />
      {!canAccept(o, now) || r.status !== "open" ? (
        <Notice tone="error">This offer can no longer be accepted. Go back to see the current offers.</Notice>
      ) : (
        <>
          <Section title="Terms" id="terms">
            <p className={ui.prewrap}>{o.terms}</p>
          </Section>
          <Section title="Cancellation policy" id="policy">
            {policy ? (
              <>
                <p className={ui.prewrap}>{terms("en") ?? "The operator hasn’t written the policy in English yet."}</p>
                <ul className={ui.list}>
                  {(policy.bands as CancellationBand[]).map((b) => (
                    <li key={b.from_days}>
                      Cancelled {b.from_days} days or more before departure: {b.percent} % of the price is charged
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className={ui.muted}>This sailing has no cancellation policy yet, so it can’t be booked.</p>
            )}
          </Section>
          {local ? (
            <Notice>
              {/* CONTENT-NEEDED #38: Faris's wording replaces this draft. */}
              Draft wording: this price is for Egyptian citizens or foreign residents of Egypt. After accepting, you’ll be asked
              to upload proof; the operator checks it before payment is due, and sends an updated offer at the right rate if
              needed.
            </Notice>
          ) : null}
          <Section title="Guests" id="guests">
            <ActionForm action={acceptOffer.bind(null, r.id, o.id, o.departure!.departs_on, offered)} submit="Accept and reserve">
              <p className={ui.muted}>
                Full names as in passports and dates of birth for all {total} guests. Ages on the departure date must match the
                offer. The first guest is the lead passenger.
              </p>
              {Array.from({ length: total }, (_, i) => (
                <div key={i} className={ui.grid}>
                  <Input
                    label={`Guest ${i + 1}: full name`}
                    name={`name_${i}`}
                    required
                    maxLength={160}
                    autoComplete={i === 0 ? "name" : "off"}
                  />
                  <Input label="Date of birth" name={`dob_${i}`} type="date" required />
                  {i === 0 ? (
                    <Input
                      label="Nationality"
                      name="nationality"
                      maxLength={2}
                      hint="Two-letter country code, for example GB or EG."
                    />
                  ) : null}
                </div>
              ))}
              <Checkboxes
                legend="Agreement"
                name="terms"
                options={[{ value: "yes", label: "I have read the terms and the cancellation policy" }]}
                checked={[]}
              />
              <p className={ui.muted}>Accepting checks the cabins are still free and reserves them. Payment details follow.</p>
            </ActionForm>
          </Section>
        </>
      )}
    </>
  );
}
