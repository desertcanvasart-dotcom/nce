import { dayBefore } from "@/lib/product/sailing-time";
import { cairoDate } from "@/lib/tours/tours";

/**
 * My journey (DASH-CUS-003, 011, 012): what a customer sees, worked out from their own records only.
 * Pure, so every scenario is unit-tested; the server gathers the records under RLS.
 */
export type JReservation = {
  id: string;
  reference: string;
  status: "awaiting_payment" | "confirmed" | "cancelled";
  vessel: string;
  route: string;
  departsOn: string;
  returnsOn: string;
  paymentDueAt: string;
  outstandingMinor: number;
  reportedMinor: number;
  currency: string;
  localRate: boolean;
  /** The latest eligibility proof's state, or "none". */
  proof: "none" | "submitted" | "verified" | "rejected";
  /** A cancellation request waiting on Nilecruz (requested, or approved with a refund still to come). */
  cancellationOpen: boolean;
  /** PROPOSED-019: where and when the ship sails on the first day, if the operator has said. */
  origin?: string;
  sailingPeriod?: "morning" | "noon" | "evening" | null;
  sailsAt?: string | null;
};
export type JTourOrder = {
  id: string;
  reference: string;
  status: "awaiting_payment" | "confirmed" | "cancelled";
  tourName: string;
  startsAt: string;
  holdUntil: string;
  totalMinor: number;
  currency: string;
  cancelState: "requested" | "refused" | "approved" | null;
};
export type JRequest = {
  id: string;
  status: "open" | "accepted" | "closed";
  label: string;
  latestDeparture: string;
  offers: { status: string; expiresAt: string }[];
};

export type ActionKind = "pay" | "tour_payment" | "proof" | "offers" | "cancellation_waiting" | "transfer_waiting";
export type Action = { kind: ActionKind; title: string; href: string; due: string | null; waiting: boolean };
export type Upcoming = { kind: "cruise" | "tour"; id: string; date: string; title: string; href: string; status: string };

export type JourneyState = {
  actions: Action[];
  next: { reservation: JReservation; tours: JTourOrder[] } | null;
  upcoming: Upcoming[];
  past: { reservations: JReservation[]; tourOrders: JTourOrder[]; requests: JRequest[] };
};

const res = (id: string) => `/dashboard/journey/reservations/${id}/`;
const tour = (id: string) => `/dashboard/journey/tours/${id}/`;

export function journeyState(
  input: { reservations: JReservation[]; tourOrders: JTourOrder[]; requests: JRequest[] },
  now: Date,
): JourneyState {
  const today = cairoDate(now);
  const t = now.getTime();
  const tourDay = (o: JTourOrder) => cairoDate(o.startsAt);
  // A paid or held order is live; an unpaid one whose hold is over is as good as cancelled.
  const tourLive = (o: JTourOrder) =>
    o.status === "confirmed" || (o.status === "awaiting_payment" && Date.parse(o.holdUntil) > t);

  const currentRes = input.reservations.filter((r) => r.status !== "cancelled" && r.returnsOn >= today);
  const currentTours = input.tourOrders.filter((o) => tourLive(o) && tourDay(o) >= today);

  const actions: Action[] = [];
  for (const r of currentRes) {
    if (r.cancellationOpen) {
      actions.push({
        kind: "cancellation_waiting",
        title: `Cancellation of ${r.reference}: Nilecruz is checking it`,
        href: res(r.id),
        due: null,
        waiting: true,
      });
      continue;
    }
    if (r.status === "awaiting_payment" && r.reportedMinor > 0)
      actions.push({
        kind: "transfer_waiting",
        title: `Your transfer for ${r.reference} is being checked`,
        href: res(r.id),
        due: null,
        waiting: true,
      });
    if (r.status === "awaiting_payment" && r.outstandingMinor - r.reportedMinor > 0)
      actions.push({
        kind: "pay",
        title: `Pay for ${r.reference} (${r.vessel})`,
        href: `${res(r.id)}#pay`,
        due: r.paymentDueAt,
        waiting: false,
      });
    if (r.localRate && (r.proof === "none" || r.proof === "rejected"))
      actions.push({
        kind: "proof",
        title:
          r.proof === "rejected"
            ? `Upload new eligibility proof for ${r.reference}`
            : `Upload eligibility proof for ${r.reference}`,
        href: `${res(r.id)}#proof`,
        due: r.paymentDueAt,
        waiting: false,
      });
  }
  for (const o of input.tourOrders) {
    if (o.status === "awaiting_payment" && Date.parse(o.holdUntil) > t)
      actions.push({
        kind: "tour_payment",
        title: `Finish paying for ${o.tourName} (${o.reference})`,
        href: `${tour(o.id)}#pay`,
        due: o.holdUntil,
        waiting: false,
      });
    if (o.status === "confirmed" && o.cancelState === "requested")
      actions.push({
        kind: "cancellation_waiting",
        title: `Cancellation of ${o.reference}: Nilecruz is checking it`,
        href: tour(o.id),
        due: null,
        waiting: true,
      });
  }
  for (const q of input.requests) {
    if (q.status !== "open") continue;
    const live = q.offers.filter((f) => f.status === "sent" && Date.parse(f.expiresAt) > t);
    if (!live.length) continue;
    const soonest = live.map((f) => f.expiresAt).sort()[0]!;
    actions.push({
      kind: "offers",
      title: `${live.length} ${live.length === 1 ? "offer" : "offers"} for your request ${q.label}`,
      href: `/dashboard/journey/requests/${q.id}/`,
      due: soonest,
      waiting: false,
    });
  }
  // Things to do first, soonest deadline first; things waiting on Nilecruz last.
  actions.sort((a, b) => Number(a.waiting) - Number(b.waiting) || (a.due ?? "~").localeCompare(b.due ?? "~"));

  const nextRes = [...currentRes].sort((a, b) => a.departsOn.localeCompare(b.departsOn))[0] ?? null;
  const next = nextRes
    ? {
        reservation: nextRes,
        tours: currentTours.filter((o) => tourDay(o) >= nextRes.departsOn && tourDay(o) <= nextRes.returnsOn),
      }
    : null;

  const upcoming: Upcoming[] = [
    ...currentRes.map((r) => ({
      kind: "cruise" as const,
      id: r.id,
      date: r.departsOn,
      title: `${r.reference} · ${r.vessel}: ${r.route}`,
      href: res(r.id),
      status: r.status,
    })),
    ...currentTours.map((o) => ({
      kind: "tour" as const,
      id: o.id,
      date: tourDay(o),
      title: o.tourName,
      href: tour(o.id),
      status: o.status,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.kind.localeCompare(b.kind));

  return {
    actions,
    next,
    upcoming,
    past: {
      reservations: input.reservations
        .filter((r) => r.status === "cancelled" || r.returnsOn < today)
        .sort((a, b) => b.departsOn.localeCompare(a.departsOn)),
      tourOrders: input.tourOrders
        .filter((o) => !tourLive(o) || tourDay(o) < today)
        .sort((a, b) => b.startsAt.localeCompare(a.startsAt)),
      // An accepted request became a booking and shows there; only closed or expired ones are listed.
      requests: input.requests.filter((q) => q.status === "closed" || (q.status === "open" && q.latestDeparture < today)),
    },
  };
}

// ── Tours that fit a cruise (DASH-CUS-011) ─────────────────────────────────────────────────────────────────
export type TourOption = {
  id: string;
  name: string;
  /** Airport transfers and Meet and Assist: only on the embarkation and disembarkation days. */
  airportService: boolean;
  scheduleIds: string[];
  sessions: { startsAt: string; placesLeft: number }[];
};

/**
 * Bookable tours linked to the cruise's schedule, with a session with places on a day of the sailing. A morning
 * sailing (PROPOSED-019) adds the day before: guests arrive then, so it's a sightseeing day and an arrival day.
 */
export function suggestTours(
  sailing: { scheduleId: string; departsOn: string; returnsOn: string; morning?: boolean },
  tours: TourOption[],
  now: Date,
): { id: string; name: string; days: string[] }[] {
  const t = now.getTime();
  const out: { id: string; name: string; days: string[] }[] = [];
  for (const tour of tours) {
    if (!tour.scheduleIds.includes(sailing.scheduleId)) continue;
    const days = new Set<string>();
    for (const s of tour.sessions) {
      if (s.placesLeft <= 0 || Date.parse(s.startsAt) <= t) continue;
      const day = cairoDate(s.startsAt);
      const first = sailing.morning ? dayBefore(sailing.departsOn) : sailing.departsOn;
      const fits = tour.airportService
        ? day === first || day === sailing.departsOn || day === sailing.returnsOn
        : day >= first && day <= sailing.returnsOn;
      if (fits) days.add(day);
    }
    if (days.size) out.push({ id: tour.id, name: tour.name, days: [...days].sort() });
  }
  return out.sort((a, b) => a.days[0]!.localeCompare(b.days[0]!) || a.name.localeCompare(b.name));
}
