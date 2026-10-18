import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ds/Badge/Badge";
import { formatMoney } from "@/components/ds/lib/format";
import { ActionForm } from "@/components/dashboard/ActionForm";
import { Input, Notice, Section, Select, TextArea, ui } from "@/components/dashboard/ui";
import { EXPIRY } from "@/lib/bookings/bookings";
import { nowMs } from "@/lib/product/departures";
import { RATE_PLANS } from "@/lib/product/pricing";
import { requireOrgRole } from "@/server/auth";
import { cabinsForDeparture, departuresForRequest, offersForRequest, request } from "@/server/bookings/queries";
import { guestsText, nightsText, OfferSummary } from "../../../../_bookings/OfferSummary";
import { isUuid } from "../../../../sections";
import { sendOffer, withdrawOffer } from "../actions";

type Props = {
  params: Promise<{ orgId: string; requestId: string }>;
  searchParams: Promise<{ departure?: string; revise?: string; sent?: string }>;
};

/**
 * DASH-OPR-011, 017–023: answer one request with a personal offer: a departure, the cabins (so the deck) and who
 * sleeps where, the price (from your rates unless you say why it differs), inclusions, terms, eligibility and expiry.
 * Sending holds no cabins. Changing a sent offer sends a new version; the old one can't be accepted.
 */
export default async function AnswerRequest({ params, searchParams }: Props) {
  const { orgId, requestId } = await params;
  if (!isUuid(orgId) || !isUuid(requestId)) notFound();
  const { company } = await requireOrgRole(orgId, ["owner", "reservations", "viewer"], {
    kind: "operator",
    returnTo: `/dashboard/operator/${orgId}/offers/${requestId}/`,
  });
  const canSend = company.teamRole === "owner" || company.teamRole === "reservations";
  const sp = await searchParams;
  const r = await request(requestId);
  if (!r) notFound();
  const [mine, departures] = await Promise.all([offersForRequest(requestId, orgId), departuresForRequest(orgId, r)]);
  const now = nowMs();
  const revising = sp.revise && isUuid(sp.revise) ? mine.find((o) => o.id === sp.revise && o.status === "sent") : undefined;
  const departureId = sp.departure && isUuid(sp.departure) ? sp.departure : revising?.departure_id;
  const chosen = departures.find((d) => d.id === departureId);
  const cabins = chosen
    ? await cabinsForDeparture(chosen.id, revising?.rate_plan ?? "international", revising?.currency ?? "USD")
    : [];
  const base = `/dashboard/operator/${orgId}/offers/${requestId}/`;
  const keep = revising ? `&revise=${revising.id}` : "";
  const lineDefault = (i: number) =>
    revising?.offer_cabins.find((c) => c.line === i + 1) ??
    (i === 0
      ? { cabin_type_id: "", adults: r.adults, child_ages: r.child_ages, price_minor: null }
      : { cabin_type_id: "", adults: 0, child_ages: [] as number[], price_minor: null });

  return (
    <>
      <p>
        <Link href={`/dashboard/operator/${orgId}/offers/`}>← Requests and offers</Link>
      </p>
      <h1 className={ui.pageTitle}>{r.origin && r.destination ? `${r.origin} → ${r.destination}` : "Flexible route"}</h1>
      <p>
        Departing {r.earliest_departure} to {r.latest_departure}
        {r.latest_finish ? `, back by ${r.latest_finish}` : ""} · {nightsText(r.nights_min, r.nights_max)} ·{" "}
        {guestsText(r.adults, r.child_ages)} · {r.cabins} cabin{r.cabins === 1 ? "" : "s"}
        {r.budget_minor ? ` · budget ${formatMoney({ amount: Number(r.budget_minor), currency: r.budget_currency! }, "en")}` : ""}
      </p>
      {r.cabin_notes ? <p>Cabins: {r.cabin_notes}</p> : null}
      {r.notes ? <p className={ui.prewrap}>{r.notes}</p> : null}
      {r.status !== "open" ? <Notice>This request is no longer open.</Notice> : null}
      {sp.sent ? (
        <Notice tone="success">Offer sent. The customer sees it now; no cabins are held until they accept.</Notice>
      ) : null}

      <Section title="Your offers on this request" id="offers">
        {mine.length ? (
          <div className={ui.cards}>
            {[...mine].reverse().map((o) => (
              <div key={o.id}>
                <OfferSummary o={o} now={now} />
                {canSend && o.status === "sent" && r.status === "open" ? (
                  <div className={ui.actions}>
                    <Link href={`${base}?revise=${o.id}&departure=${o.departure_id}#new`}>
                      Change it (sends version {o.version + 1})
                    </Link>
                    <ActionForm action={withdrawOffer.bind(null, orgId, requestId, o.id)} submit="Withdraw" variant="ghost" />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className={ui.muted}>You haven’t answered this request yet.</p>
        )}
      </Section>

      {canSend && r.status === "open" ? (
        <Section title={revising ? `Version ${revising.version + 1} of your offer` : "New offer"} id="new">
          {revising ? (
            <Notice>
              Sending replaces version {revising.version}: the customer is told to review the update, and the old version can no
              longer be accepted (DASH-OPR-023).
            </Notice>
          ) : null}
          <h3 className={ui.subTitle}>1. Departure</h3>
          {departures.length ? (
            <ul className={ui.list}>
              {departures.map((d) => (
                <li key={d.id}>
                  <Link href={`${base}?departure=${d.id}${keep}#new`} aria-current={d.id === chosen?.id ? "true" : undefined}>
                    {d.departs_on} · {d.vessel?.name} · {d.schedule?.origin} → {d.schedule?.destination}, {d.schedule?.nights}{" "}
                    nights
                  </Link>{" "}
                  {d.bookable ? <Badge tone="success">Bookable</Badge> : <Badge tone="danger">Not bookable yet</Badge>}
                </li>
              ))}
            </ul>
          ) : (
            <p className={ui.muted}>None of your published sailings fit these dates and nights.</p>
          )}

          {chosen ? (
            <>
              <h3 className={ui.subTitle}>2. Cabins, price and terms</h3>
              {!chosen.bookable ? (
                <Notice tone="error">
                  This sailing isn’t bookable yet (it needs a cancellation policy, rates and confirmed availability). The customer
                  couldn’t accept an offer for it.
                </Notice>
              ) : null}
              <ul className={ui.list}>
                {cabins.map((c) => (
                  <li key={c.id}>
                    {c.name}, {c.deck} deck · sleeps {c.max_occupancy} · {c.available} left
                  </li>
                ))}
              </ul>
              <ActionForm
                action={sendOffer.bind(null, orgId, requestId, revising?.id ?? null)}
                submit={revising ? "Send the new version" : "Send offer"}
              >
                <input type="hidden" name="departure_id" value={chosen.id} />
                <div className={ui.grid}>
                  <Select
                    label="Rate plan"
                    name="plan"
                    required
                    options={RATE_PLANS}
                    defaultValue={revising?.rate_plan ?? "international"}
                  />
                  <Select
                    label="Currency"
                    name="currency"
                    required
                    defaultValue={revising?.currency ?? "USD"}
                    options={[
                      { value: "USD", label: "US$" },
                      { value: "EUR", label: "€" },
                      { value: "EGP", label: "E£ (local plans only)" },
                    ]}
                  />
                  <Input
                    label="Valid for (hours)"
                    name="expires_hours"
                    inputMode="numeric"
                    required
                    defaultValue={EXPIRY.defaultHours}
                    hint="24 to 336 hours (14 days)."
                  />
                </div>
                {Array.from({ length: r.cabins }, (_, i) => {
                  const d = lineDefault(i);
                  return (
                    <fieldset key={i} className={ui.choices}>
                      <legend className={ui.label}>Cabin {i + 1}</legend>
                      <div className={ui.grid}>
                        <Select
                          label="Cabin type"
                          name={`cabin_type_${i}`}
                          required
                          placeholder="Choose"
                          defaultValue={d.cabin_type_id}
                          options={cabins.map((c) => ({ value: c.id, label: `${c.name} (${c.deck} deck)` }))}
                        />
                        <Input label="Adults" name={`adults_${i}`} inputMode="numeric" required defaultValue={d.adults} />
                        <Input
                          label="Children’s ages"
                          name={`child_ages_${i}`}
                          defaultValue={d.child_ages.join(", ")}
                          hint="For example “7”."
                        />
                        <Input
                          label="Price for this cabin"
                          name={`price_${i}`}
                          inputMode="decimal"
                          defaultValue={
                            d.price_minor !== null && d.price_minor !== undefined
                              ? (Number(d.price_minor) / 100).toFixed(2)
                              : undefined
                          }
                          hint="Leave empty to use your rates and child bands."
                        />
                      </div>
                    </fieldset>
                  );
                })}
                <Input
                  label="Price note (if different from your rates)"
                  name="pricing_note"
                  maxLength={500}
                  defaultValue={revising?.pricing_note}
                />
                <TextArea label="Included" name="inclusions" rows={2} maxLength={3000} defaultValue={revising?.inclusions} />
                <TextArea label="Terms" name="terms" rows={4} maxLength={6000} required defaultValue={revising?.terms} />
                <TextArea
                  label="Who this offer is for"
                  name="eligibility"
                  rows={2}
                  maxLength={2000}
                  required
                  defaultValue={revising?.eligibility_conditions}
                  hint="Confirm the family make-up and, for Egyptian-citizen or resident rates, that proof will be checked."
                />
              </ActionForm>
            </>
          ) : null}
        </Section>
      ) : null}
    </>
  );
}
