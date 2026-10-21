import { formatMoney } from "@/components/ds/lib/format";

/** Shared wording for tour orders (DASH-PAY-014). */
export const TOUR_ORDER_BADGE = {
  awaiting_payment: { tone: "accent", text: "Awaiting payment" },
  confirmed: { tone: "success", text: "Confirmed" },
  cancelled: { tone: "neutral", text: "Cancelled" },
} as const;

export const TOUR_CANCEL = {
  requested: "Cancellation requested: Nilecruz is checking it",
  refused: "Cancellation not accepted",
  approved: "Cancellation approved",
} as const;

export const money = (m: number | string, currency: string) => formatMoney({ amount: Number(m), currency }, "en");

export const guestsLabel = (ages: number[]) =>
  `${ages.length} ${ages.length === 1 ? "guest" : "guests"}${ages.some((a) => a < 18) ? ` (ages ${ages.join(", ")})` : ""}`;

export const SESSION_KIND = { shared: "Shared", private: "Private" } as const;
/** ADR-097: how a tour order is run. */
export const TOUR_MODE = {
  shared: "Shared",
  private: "Private",
  transfer: "Private transfer",
  assist: "Meet and assist",
} as const;
export const PRICING = { per_guest: "per guest (under-3s free)", per_group: "for the whole party" } as const;
