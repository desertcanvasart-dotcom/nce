import { describe, expect, it } from "vitest";
import { journeyState, suggestTours, type JRequest, type JReservation, type JTourOrder } from "@/lib/journey/journey";

// 20 Oct 2026 10:00 in Cairo (UTC+3 until the end of summer time on 30 Oct).
const NOW = new Date("2026-10-20T07:00:00Z");
const r = (over: Partial<JReservation>): JReservation => ({
  id: "r",
  reference: "NC-AAAAAA",
  status: "confirmed",
  vessel: "Sample Ship",
  route: "Luxor → Aswan",
  departsOn: "2026-12-01",
  returnsOn: "2026-12-05",
  paymentDueAt: "2026-10-27T21:00:00Z",
  outstandingMinor: 0,
  reportedMinor: 0,
  currency: "USD",
  localRate: false,
  proof: "none",
  cancellationOpen: false,
  ...over,
});
const o = (over: Partial<JTourOrder>): JTourOrder => ({
  id: "o",
  reference: "NT-AAAAAA",
  status: "confirmed",
  tourName: "Sample Tour",
  startsAt: "2026-12-02T08:00:00Z",
  holdUntil: "2026-10-20T07:30:00Z",
  totalMinor: 10000,
  currency: "USD",
  cancelState: null,
  ...over,
});
const q = (over: Partial<JRequest>): JRequest => ({
  id: "q",
  status: "open",
  label: "Luxor → Aswan, Dec 2026",
  latestDeparture: "2026-12-20",
  offers: [],
  ...over,
});
const run = (i: Partial<{ reservations: JReservation[]; tourOrders: JTourOrder[]; requests: JRequest[] }>, now = NOW) =>
  journeyState({ reservations: [], tourOrders: [], requests: [], ...i }, now);

describe("actions on the Overview (DASH-CUS-003)", () => {
  it("is empty for a new customer", () => {
    expect(run({})).toEqual({ actions: [], next: null, upcoming: [], past: { reservations: [], tourOrders: [], requests: [] } });
  });
  it("asks to pay an unpaid reservation by its deadline", () => {
    const a = run({ reservations: [r({ id: "r1", status: "awaiting_payment", outstandingMinor: 200000 })] }).actions;
    expect(a).toEqual([
      {
        kind: "pay",
        title: "Pay for NC-AAAAAA (Sample Ship)",
        href: "/dashboard/journey/reservations/r1/#pay",
        due: "2026-10-27T21:00:00Z",
        waiting: false,
      },
    ]);
  });
  it("shows a reported transfer as waiting, and asks only for what it doesn't cover", () => {
    expect(
      run({ reservations: [r({ status: "awaiting_payment", outstandingMinor: 200000, reportedMinor: 200000 })] }).actions.map(
        (x) => x.kind,
      ),
    ).toEqual(["transfer_waiting"]);
    expect(
      run({ reservations: [r({ status: "awaiting_payment", outstandingMinor: 200000, reportedMinor: 50000 })] }).actions.map(
        (x) => x.kind,
      ),
    ).toEqual(["pay", "transfer_waiting"]);
  });
  it("asks for eligibility proof on a local rate until it's submitted, and again if rejected", () => {
    expect(run({ reservations: [r({ localRate: true })] }).actions.map((x) => x.kind)).toEqual(["proof"]);
    expect(run({ reservations: [r({ localRate: true, proof: "submitted" })] }).actions).toEqual([]);
    expect(run({ reservations: [r({ localRate: true, proof: "rejected" })] }).actions[0]!.title).toMatch(/new eligibility proof/);
  });
  it("replaces every other action with 'waiting' while a cancellation is open", () => {
    const a = run({
      reservations: [r({ status: "awaiting_payment", outstandingMinor: 1, localRate: true, cancellationOpen: true })],
    }).actions;
    expect(a.map((x) => [x.kind, x.waiting])).toEqual([["cancellation_waiting", true]]);
  });
  it("asks to finish paying a held tour order, but not once the hold is over", () => {
    expect(run({ tourOrders: [o({ status: "awaiting_payment" })] }).actions.map((x) => x.kind)).toEqual(["tour_payment"]);
    expect(run({ tourOrders: [o({ status: "awaiting_payment", holdUntil: "2026-10-20T06:00:00Z" })] }).actions).toEqual([]);
  });
  it("counts live offers on open requests, due at the soonest expiry", () => {
    const req = q({
      offers: [
        { status: "sent", expiresAt: "2026-10-23T07:00:00Z" },
        { status: "sent", expiresAt: "2026-10-21T07:00:00Z" },
        { status: "superseded", expiresAt: "2026-10-22T07:00:00Z" },
        { status: "sent", expiresAt: "2026-10-19T07:00:00Z" },
      ],
    });
    expect(run({ requests: [req] }).actions).toEqual([
      {
        kind: "offers",
        title: "2 offers for your request Luxor → Aswan, Dec 2026",
        href: "/dashboard/journey/requests/q/",
        due: "2026-10-21T07:00:00Z",
        waiting: false,
      },
    ]);
    expect(run({ requests: [{ ...req, status: "closed" }] }).actions).toEqual([]);
  });
  it("orders to-dos by deadline, with waiting items last", () => {
    const a = run({
      reservations: [
        r({ id: "late", status: "awaiting_payment", outstandingMinor: 1, paymentDueAt: "2026-11-01T21:00:00Z" }),
        r({ id: "soon", status: "awaiting_payment", outstandingMinor: 1, paymentDueAt: "2026-10-22T21:00:00Z" }),
        r({ id: "c", cancellationOpen: true }),
      ],
      tourOrders: [o({ status: "awaiting_payment" })],
    }).actions;
    expect(a.map((x) => x.kind)).toEqual(["tour_payment", "pay", "pay", "cancellation_waiting"]);
    expect(a[1]!.href).toMatch(/soon/);
  });
});

describe("next trip, upcoming and past (DASH-CUS-003, 012)", () => {
  it("picks the nearest live cruise, with the tours booked during it", () => {
    const s = run({
      reservations: [
        r({ id: "later", departsOn: "2027-01-10", returnsOn: "2027-01-14" }),
        r({ id: "near" }),
        r({ id: "x", status: "cancelled", departsOn: "2026-11-01" }),
      ],
      tourOrders: [o({ id: "during" }), o({ id: "after", startsAt: "2026-12-09T08:00:00Z" })],
    });
    expect(s.next!.reservation.id).toBe("near");
    expect(s.next!.tours.map((x) => x.id)).toEqual(["during"]);
    expect(s.upcoming.map((u) => u.id)).toEqual(["near", "during", "after", "later"]);
  });
  it("keeps a cruise under way as current, and moves it to past the day after it ends (Cairo dates)", () => {
    const onBoard = r({ departsOn: "2026-10-18", returnsOn: "2026-10-20" });
    expect(run({ reservations: [onBoard] }).upcoming).toHaveLength(1);
    // 23:30 on 20 Oct in Cairo is 20:30 UTC; 00:30 on 21 Oct is 21:30 UTC.
    expect(run({ reservations: [onBoard] }, new Date("2026-10-20T20:30:00Z")).past.reservations).toHaveLength(0);
    expect(run({ reservations: [onBoard] }, new Date("2026-10-20T21:30:00Z")).past.reservations).toHaveLength(1);
  });
  it("lists cancelled bookings, finished tours, expired holds and closed or expired requests as past", () => {
    const s = run({
      reservations: [r({ id: "c", status: "cancelled" })],
      tourOrders: [
        o({ id: "done", startsAt: "2026-10-10T08:00:00Z" }),
        o({ id: "lapsed", status: "awaiting_payment", holdUntil: "2026-10-20T06:00:00Z" }),
      ],
      requests: [
        q({ id: "closed", status: "closed" }),
        q({ id: "expired", latestDeparture: "2026-10-19" }),
        q({ id: "live" }),
        q({ id: "booked", status: "accepted" }),
      ],
    });
    expect(s.past.reservations.map((x) => x.id)).toEqual(["c"]);
    expect(s.past.tourOrders.map((x) => x.id).sort()).toEqual(["done", "lapsed"]);
    expect(s.past.requests.map((x) => x.id)).toEqual(["closed", "expired"]);
    expect(s.upcoming).toEqual([]);
  });
});

describe("tours that fit the cruise (DASH-CUS-011)", () => {
  const sailing = { scheduleId: "s1", departsOn: "2026-12-01", returnsOn: "2026-12-05" };
  const at = (day: string) => `${day}T07:00:00Z`;
  it("suggests linked tours with places on a sailing day", () => {
    const out = suggestTours(
      sailing,
      [
        {
          id: "a",
          name: "Abu Simbel",
          airportService: false,
          scheduleIds: ["s1"],
          sessions: [
            { startsAt: at("2026-12-04"), placesLeft: 3 },
            { startsAt: at("2026-12-07"), placesLeft: 3 },
          ],
        },
        {
          id: "b",
          name: "Not linked",
          airportService: false,
          scheduleIds: ["s2"],
          sessions: [{ startsAt: at("2026-12-02"), placesLeft: 3 }],
        },
        {
          id: "c",
          name: "Full",
          airportService: false,
          scheduleIds: ["s1"],
          sessions: [{ startsAt: at("2026-12-02"), placesLeft: 0 }],
        },
      ],
      NOW,
    );
    expect(out).toEqual([{ id: "a", name: "Abu Simbel", days: ["2026-12-04"] }]);
  });
  it("offers airport services only on embarkation and disembarkation days", () => {
    const out = suggestTours(
      sailing,
      [
        {
          id: "t",
          name: "Luxor Airport Private Transfer",
          airportService: true,
          scheduleIds: ["s1"],
          sessions: ["2026-11-30", "2026-12-01", "2026-12-03", "2026-12-05"].map((d) => ({ startsAt: at(d), placesLeft: 1 })),
        },
      ],
      NOW,
    );
    expect(out[0]!.days).toEqual(["2026-12-01", "2026-12-05"]);
  });
});
