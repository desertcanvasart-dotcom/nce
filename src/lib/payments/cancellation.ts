import { cancellationPercent, type CancellationBand } from "@/lib/tours/tours";

/**
 * DASH-PAY-011, 012: what cancelling costs. Mirrors app.cancellation_quote in the database.
 * The charge is a share of the whole price, by the Cairo days left before departure on the day the request arrives.
 * It only ever comes out of what was paid (ADR-094): paid beyond the charge is refunded, and nothing more is ever owed,
 * so cancelling an unpaid booking costs nothing.
 */
export type CancellationQuote = {
  daysBefore: number;
  percent: number;
  chargeMinor: number;
  refundMinor: number;
  /** What is kept towards the charge: never more than was paid. */
  keptMinor: number;
};

/** Whole days from one Cairo calendar date to another, both as YYYY-MM-DD. */
export function daysBetween(fromDay: string, toDay: string): number {
  return Math.round((Date.parse(`${toDay}T00:00:00Z`) - Date.parse(`${fromDay}T00:00:00Z`)) / 86_400_000);
}

export function quoteCancellation(
  bands: CancellationBand[],
  totalMinor: number,
  paidMinor: number,
  requestedOn: string,
  departsOn: string,
): CancellationQuote {
  const daysBefore = daysBetween(requestedOn, departsOn);
  if (daysBefore < 0) throw new Error("This sailing has already left");
  const percent = cancellationPercent(bands, daysBefore);
  const chargeMinor = Math.floor((totalMinor * percent) / 100 + 0.5);
  return {
    daysBefore,
    percent,
    chargeMinor,
    refundMinor: Math.max(paidMinor - chargeMinor, 0),
    keptMinor: Math.min(chargeMinor, paidMinor),
  };
}

/** The sentence after "the policy charges N %: X." on a booking page (ADR-094). */
export function cancellationOutcome(
  q: { charge_minor: number; paid_minor: number; refund_minor: number },
  money: (minor: number) => string,
  you = "You have",
): string {
  if (q.charge_minor === 0)
    return q.paid_minor > 0 ? `All ${money(q.paid_minor)} paid would be refunded.` : "Nothing is charged.";
  if (q.paid_minor === 0)
    return `${you} paid nothing yet, so cancelling costs nothing: the charge only comes out of payments made.`;
  if (q.refund_minor > 0) return `${you} paid ${money(q.paid_minor)}, so ${money(q.refund_minor)} would be refunded.`;
  return `${you} paid ${money(q.paid_minor)}; it is kept towards the charge, and nothing more is owed.`;
}

export const CANCELLATION_STATUS = {
  requested: { tone: "accent", text: "Cancellation requested" },
  withdrawn: { tone: "neutral", text: "Request withdrawn" },
  rejected: { tone: "danger", text: "Cancellation not accepted" },
  refund_due: { tone: "accent", text: "Cancelled, refund being issued" },
  closed: { tone: "neutral", text: "Cancelled" },
} as const;

export const OPERATOR_REVIEW = {
  pending: "Waiting for the operator to check the figures",
  confirmed: "The operator confirmed the figures",
  contested: "The operator contested the figures",
} as const;
