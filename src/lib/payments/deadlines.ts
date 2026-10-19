import { cairoToUtc } from "@/lib/tours/tours";

/**
 * Payment deadlines (DASH-PAY-001–007, DATA-039, ADR-027). Mirrors app.payment_due in the database; both are
 * pinned by the same boundary tests. All dates are Cairo calendar dates (YYYY-MM-DD).
 *
 * - Departures 24 Dec – 7 Jan (inclusive) or inside a premium period: full payment within 3 days of booking.
 * - Other October–April departures: within 7 days. May–September departures: within 14 days.
 * - The season is set by the departure date; the days count from the booking date.
 * - Never later than departure: at the latest, by the end of the day before departure (and never before the
 *   booking day itself, for last-minute bookings).
 * - The deadline is the end of the due day in Cairo (midnight that night).
 */

export type PremiumPeriod = { name: string; starts_on: string; ends_on: string };
export type DeadlineRule = "festive" | "premium" | "winter" | "summer";
export type Deadline = { rule: DeadlineRule; days: number; dueOn: string; dueAt: Date; period?: string };

const DAY = 86_400_000;
const addDays = (date: string, n: number) => new Date(Date.parse(`${date}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
const monthDay = (date: string) => date.slice(5);

export function deadlineRule(departsOn: string, periods: PremiumPeriod[]): { rule: DeadlineRule; days: number; period?: string } {
  const md = monthDay(departsOn);
  if (md >= "12-24" || md <= "01-07") return { rule: "festive", days: 3 };
  const p = periods.find((x) => departsOn >= x.starts_on && departsOn <= x.ends_on);
  if (p) return { rule: "premium", days: 3, period: p.name };
  const month = Number(departsOn.slice(5, 7));
  return month >= 5 && month <= 9 ? { rule: "summer", days: 14 } : { rule: "winter", days: 7 };
}

export function paymentDeadline(bookedOn: string, departsOn: string, periods: PremiumPeriod[] = []): Deadline {
  const r = deadlineRule(departsOn, periods);
  let dueOn = addDays(bookedOn, r.days);
  const dayBefore = addDays(departsOn, -1);
  if (dueOn > dayBefore) dueOn = dayBefore;
  if (dueOn < bookedOn) dueOn = bookedOn;
  // End of the due day in Cairo = 00:00 Cairo the next day.
  return { ...r, dueOn, dueAt: cairoToUtc(addDays(dueOn, 1), "00:00") };
}

export const RULE_WORDS: Record<DeadlineRule, string> = {
  festive: "Christmas and New Year departures (24 Dec – 7 Jan) are paid within 3 days of booking",
  premium: "departures in a premium period are paid within 3 days of booking",
  winter: "October–April departures are paid within 7 days of booking",
  summer: "May–September departures are paid within 14 days of booking",
};

// ── Commission and payables (DATA-036, 037, ADR-026) ─────────────────────────────────────────────────────
export const COMMISSION_BP = 1000; // 10.00 %, also a platform setting

/** One verified cruise payment: Nilecruz's commission (rounded half up) and the operator's payable. */
export function commissionOf(amountMinor: number, bp = COMMISSION_BP): { commissionMinor: number; payableMinor: number } {
  const commissionMinor = Math.floor((amountMinor * bp) / 10_000 + 0.5);
  return { commissionMinor, payableMinor: amountMinor - commissionMinor };
}

/** A refund reverses commission and payable in proportion to the share of the payment refunded. */
export function reversalOf(
  payment: { amountMinor: number; commissionMinor: number },
  refundMinor: number,
): { commissionMinor: number; payableMinor: number } {
  if (refundMinor <= 0) return { commissionMinor: 0, payableMinor: 0 };
  const share = Math.min(refundMinor, payment.amountMinor) / payment.amountMinor;
  const commissionMinor = Math.floor(payment.commissionMinor * share + 0.5);
  return { commissionMinor: -commissionMinor, payableMinor: -(Math.min(refundMinor, payment.amountMinor) - commissionMinor) };
}

/** What release at the deadline does (DATA-040, DASH-PAY-008, 009). */
export function releaseDecision(r: {
  status: string;
  dueAt: Date;
  now: Date;
  outstandingMinor: number;
  reportedAwaiting: number;
}): "keep" | "release" | "review" {
  if (r.status !== "awaiting_payment" || r.outstandingMinor <= 0 || r.now < r.dueAt) return "keep";
  return r.reportedAwaiting > 0 ? "review" : "release";
}
