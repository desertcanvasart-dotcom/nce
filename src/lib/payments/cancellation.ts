import { cancellationPercent, type CancellationBand } from "@/lib/tours/tours";

/**
 * DASH-PAY-011, 012: what cancelling costs. Mirrors app.cancellation_quote in the database.
 * The charge is a share of the whole price, by the Cairo days left before departure on the day the request arrives.
 * What was paid beyond the charge is refunded; a charge beyond what was paid is still owed.
 */
export type CancellationQuote = {
  daysBefore: number;
  percent: number;
  chargeMinor: number;
  refundMinor: number;
  unpaidChargeMinor: number;
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
    unpaidChargeMinor: Math.max(chargeMinor - paidMinor, 0),
  };
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
