import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/dashboard/ActionForm";
import { Checkboxes, Input, Notice, Section, ui } from "@/components/dashboard/ui";
import { canAccept } from "@/lib/bookings/bookings";
import { nowMs } from "@/lib/product/departures";
import { bandLines, type CancellationBand } from "@/lib/tours/tours";
import { requireOrgRole } from "@/server/auth";
import { offer, policyFor, request } from "@/server/bookings/queries";
import { OfferSummary } from "../../../../../../_bookings/OfferSummary";
import { isUuid } from "../../../../../../sections";
import { partnerAcceptOffer } from "../../../../actions";

type Props = { params: Promise<{ orgId: string; requestId: string; offerId: string }> };

/** DASH-B2B-004, 006: read the terms and the policy, name every guest, add the client's reference and your price, accept. */
export default async function PartnerAcceptOffer({ params }: Props) {
  const { orgId, requestId, offerId } = await params;
  if (!isUuid(orgId) || !isUuid(requestId) || !isUuid(offerId)) notFound();
  await requireOrgRole(orgId, ["owner", "reservations"], {
    kind: "partner",
    returnTo: `/dashboard/partner/${orgId}/requests/${requestId}/accept/${offerId}/`,
  });
  const [r, o] = await Promise.all([request(requestId), offer(offerId)]);
  if (!r || !o || r.buyer_org_id !== orgId || o.request_id !== r.id) notFound();
  const now = nowMs();
  const policy = o.departure ? await policyFor(o.departure.id) : null;
  const terms = policy?.cancellation_policy_translations.find((t) => t.locale === "en")?.terms;
  const offered = {
    adults: o.offer_cabins.reduce((n, c) => n + c.adults, 0),
    childAges: o.offer_cabins.flatMap((c) => c.child_ages),
  };
  const total = offered.adults + offered.childAges.length;
  const back = `/dashboard/partner/${orgId}/requests/${r.id}/`;

  return (
    <>
      <p>
        <Link href={back}>← Back to the offers</Link>
      </p>
      <h1 className={ui.pageTitle}>Accept for your client</h1>
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
                <p className={ui.prewrap}>{terms ?? "The operator hasn’t written the policy in English yet."}</p>
                <ul className={ui.list}>
                  {bandLines(policy.bands as CancellationBand[], "departure").map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p className={ui.muted}>This sailing has no cancellation policy yet, so it can’t be booked.</p>
            )}
          </Section>
          <Section title="Guests and your client" id="guests">
            <ActionForm
              action={partnerAcceptOffer.bind(null, orgId, r.id, o.id, o.departure!.departs_on, offered)}
              submit="Accept and reserve"
            >
              <p className={ui.muted}>
                Full names as in passports and dates of birth for all {total} guests. Ages on the departure date must match the
                offer. The first guest is the lead passenger.
              </p>
              {Array.from({ length: total }, (_, i) => (
                <div key={i} className={ui.grid}>
                  <Input label={`Guest ${i + 1}: full name`} name={`name_${i}`} required maxLength={160} autoComplete="off" />
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
              <div className={ui.grid}>
                <Input label="Your client reference" name="client_reference" maxLength={120} hint="Only your agency sees it." />
                <Input
                  label={`Your selling price (${o.currency}, optional)`}
                  name="selling_total"
                  inputMode="decimal"
                  hint="What you charge your client. Only your agency sees it."
                />
              </div>
              <Checkboxes
                legend="Agreement"
                name="terms"
                options={[{ value: "yes", label: "The client has read the terms and the cancellation policy" }]}
                checked={[]}
              />
              <p className={ui.muted}>
                Accepting checks the cabins are still free and reserves them for your company. Your finance colleagues or the
                owner pay it from Company bookings.
              </p>
            </ActionForm>
          </Section>
        </>
      )}
    </>
  );
}
