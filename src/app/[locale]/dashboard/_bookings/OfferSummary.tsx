import { Badge } from "@/components/ds/Badge/Badge";
import { formatMoney } from "@/components/ds/lib/format";
import { ui } from "@/components/dashboard/ui";
import { CairoTime } from "@/components/shell/CairoTime";
import { offerView, type OfferView } from "@/lib/bookings/bookings";
import type { OfferRow } from "@/server/bookings/queries";

export const OFFER_BADGE: Record<OfferView, { tone: "success" | "accent" | "danger" | "neutral"; text: string }> = {
  open: { tone: "success", text: "Open" },
  expired: { tone: "neutral", text: "Expired" },
  superseded: { tone: "neutral", text: "Replaced by a newer version" },
  withdrawn: { tone: "neutral", text: "Withdrawn" },
  accepted: { tone: "accent", text: "Accepted" },
  closed: { tone: "neutral", text: "Closed" },
};
export const PLAN_LABEL: Record<string, string> = {
  international: "International",
  egyptian_citizen: "Egyptian citizen",
  foreign_resident: "Foreign resident in Egypt",
  trade: "Trade",
};
const money = (minor: number, currency: string) => formatMoney({ amount: Number(minor), currency }, "en");
export const guestsText = (adults: number, ages: number[]) =>
  `${adults} adult${adults === 1 ? "" : "s"}${ages.length ? `, children aged ${[...ages].sort((a, b) => a - b).join(", ")}` : ""}`;

/** DASH-CUS-005, 006: the facts of one offer: real dates, route, vessel, cabins with decks, price, terms, expiry. */
export function OfferSummary({ o, now, title }: { o: OfferRow; now: number; title?: string }) {
  const view = offerView(o, now);
  const s = o.departure?.schedule;
  const guests = o.offer_cabins.reduce((n, c) => n + c.adults + c.child_ages.length, 0);
  return (
    <article className={ui.card} aria-label={title ?? `Offer for ${o.departure?.vessel?.name ?? "a cruise"}`}>
      <h3 className={ui.subTitle}>
        {o.departure?.vessel?.name} · {s ? `${s.origin} → ${s.destination}, ${s.nights} nights` : ""}
      </h3>
      <p className={ui.actions}>
        <Badge tone={OFFER_BADGE[view].tone}>{OFFER_BADGE[view].text}</Badge>
        <span className={ui.muted}>Version {o.version}</span>
      </p>
      <dl className={ui.grid}>
        <div>
          <dt className={ui.label}>Sailing</dt>
          <dd>
            {o.departure?.departs_on} to {o.departure?.returns_on}
          </dd>
        </div>
        <div>
          <dt className={ui.label}>Total ({guests} guests)</dt>
          <dd>
            <strong>{money(o.total_minor, o.currency)}</strong>
            {o.list_total_minor && o.list_total_minor !== o.total_minor ? (
              <span className={ui.muted}> (rates: {money(o.list_total_minor, o.currency)})</span>
            ) : null}
          </dd>
        </div>
        <div>
          <dt className={ui.label}>Rate</dt>
          <dd>{PLAN_LABEL[o.rate_plan] ?? o.rate_plan}</dd>
        </div>
        <div>
          <dt className={ui.label}>Valid until</dt>
          <dd>
            <CairoTime value={o.expires_at} />
          </dd>
        </div>
      </dl>
      <ul className={ui.list}>
        {o.offer_cabins
          .sort((a, b) => a.line - b.line)
          .map((c) => (
            <li key={c.line}>
              Cabin {c.line}: {c.cabin_name}, {c.deck} deck · {guestsText(c.adults, c.child_ages)} · {money(c.price_minor, o.currency)}
            </li>
          ))}
      </ul>
      {o.pricing_note ? <p className={ui.muted}>Price note: {o.pricing_note}</p> : null}
      {o.inclusions ? <p>Included: {o.inclusions}</p> : null}
      <p className={ui.muted}>For: {o.eligibility_conditions}</p>
      {o.gratuity_usd_minor ? (
        <p className={ui.muted}>
          Crew gratuity: {money(o.gratuity_usd_minor, "USD")} per person (aged 3 and over) per night, paid on board, not in the
          total.
        </p>
      ) : null}
    </article>
  );
}
