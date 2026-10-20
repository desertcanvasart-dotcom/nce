import { Badge } from "@/components/ds/Badge/Badge";
import { formatMoney } from "@/components/ds/lib/format";
import { Section, ui } from "@/components/dashboard/ui";
import { CairoTime } from "@/components/shell/CairoTime";
import { bandLines, type CancellationBand } from "@/lib/tours/tours";
import type { reservation } from "@/server/bookings/queries";
import { guestsText, PLAN_LABEL } from "./OfferSummary";
import { SailingTime } from "./SailingTime";

type Res = NonNullable<Awaited<ReturnType<typeof reservation>>>;

export const RESERVATION_BADGE = {
  awaiting_payment: { tone: "accent", text: "Awaiting payment" },
  confirmed: { tone: "success", text: "Confirmed" },
  cancelled: { tone: "neutral", text: "Cancelled" },
} as const;

/**
 * DASH-ADM-093: the booking record as accepted: sailing, guests, cabins and decks, prices, payment status and the
 * terms and cancellation policy exactly as shown at acceptance. Passenger details are shown only to people RLS lets
 * read them (SEC-013).
 */
export function ReservationRecord({ r }: { r: Res }) {
  const money = (minor: number, currency = r.currency) => formatMoney({ amount: Number(minor), currency }, "en");
  const s = r.departure?.schedule;
  const policy = r.policy as { bands?: CancellationBand[]; terms?: Record<string, string> };
  return (
    <>
      <p className={ui.actions}>
        <Badge tone={RESERVATION_BADGE[r.status].tone}>{RESERVATION_BADGE[r.status].text}</Badge>
        <span className={ui.muted}>
          Reserved <CairoTime value={r.created_at} />
        </span>
      </p>
      <Section title="Sailing" id="sailing">
        <SailingTime schedule={s} />
        <dl className={ui.grid}>
          <div>
            <dt className={ui.label}>Vessel</dt>
            <dd>{r.vessel?.name}</dd>
          </div>
          <div>
            {/* ADR-094: the operator sells the cruise; Nilecruz books it as the operator's agent. */}
            <dt className={ui.label}>Sold by</dt>
            <dd>{r.seller_name ? `${r.seller_name}, the operator; booked through Nilecruz as its agent` : "The operator"}</dd>
          </div>
          <div>
            <dt className={ui.label}>Route</dt>
            <dd>{s ? `${s.origin} → ${s.destination}, ${s.nights} nights` : "—"}</dd>
          </div>
          <div>
            <dt className={ui.label}>Dates</dt>
            <dd>
              {r.departure?.departs_on} to {r.departure?.returns_on}
            </dd>
          </div>
          <div>
            <dt className={ui.label}>Rate</dt>
            <dd>{PLAN_LABEL[r.rate_plan] ?? r.rate_plan}</dd>
          </div>
          <div>
            <dt className={ui.label}>Total</dt>
            <dd>
              <strong>{money(r.total_minor)}</strong>
            </dd>
          </div>
          <div>
            <dt className={ui.label}>Payment</dt>
            <dd>{r.status === "awaiting_payment" ? "Not paid yet (see Payment above)" : RESERVATION_BADGE[r.status].text}</dd>
          </div>
        </dl>
        {r.gratuity_usd_minor ? (
          <p className={ui.muted}>
            Crew gratuity: {money(r.gratuity_usd_minor, "USD")} per person (aged 3 and over) per night, paid on board, not in the
            total.
          </p>
        ) : null}
      </Section>
      <Section title="Cabins" id="cabins">
        <ul className={ui.list}>
          {[...r.reservation_cabins]
            .sort((a, b) => a.line - b.line)
            .map((c) => (
              <li key={c.line}>
                Cabin {c.line}: {c.cabin_name}, {c.deck} deck · {guestsText(c.adults, c.child_ages)} · {money(c.price_minor)}
              </li>
            ))}
        </ul>
      </Section>
      <Section title="Guests" id="guests">
        {r.passengers.length ? (
          <ol className={ui.list}>
            {r.passengers.map((p) => (
              <li key={p.position}>
                {p.full_name} · born {p.date_of_birth}
                {p.position === 1 ? ` · lead passenger${p.nationality ? `, ${p.nationality}` : ""}` : ""}
              </li>
            ))}
          </ol>
        ) : (
          <p className={ui.muted}>Guest details are not shown to you.</p>
        )}
      </Section>
      <Section title="Terms as accepted" id="terms">
        <p className={ui.prewrap}>{r.terms}</p>
        <h3 className={ui.subTitle}>Cancellation policy</h3>
        {policy.terms?.en ? <p className={ui.prewrap}>{policy.terms.en}</p> : null}
        <ul className={ui.list}>
          {bandLines(policy.bands ?? [], "departure").map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </Section>
    </>
  );
}
