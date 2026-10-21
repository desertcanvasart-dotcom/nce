import { describe, expect, it } from "vitest";
import { requestDefaults } from "@/lib/marketplace/vessel";
import { emailedElsewhere, noticeEmail, OPTIONAL_KINDS, rolesFor } from "@/lib/notices/email";
import { emptyPlan, planProblems, readPlan, requestHref } from "@/lib/plan/plan";

const TODAY = "2026-10-21";
const routes = [{ origin: "Luxor", destination: "Aswan" }];

describe("Plan my cruise (PAGE-105, DASH-PUB-007)", () => {
  it("starts with sensible dates a month ahead, and is ready to send", () => {
    const p = emptyPlan(TODAY);
    expect(p).toMatchObject({ earliest: "2026-11-20", latest: "2026-12-20", adults: 2, cabins: 1 });
    expect(planProblems(p, TODAY)).toEqual([]);
  });
  it("says what to fix, in plain words", () => {
    const p = {
      ...emptyPlan(TODAY),
      earliest: "2026-10-20",
      nightsMin: 8,
      nightsMax: 4,
      childAges: "7, 19",
      cabins: 2,
      budget: "lots",
    };
    expect(planProblems(p, TODAY)).toEqual([
      "The earliest departure must be after today.",
      "Nights are 1 to 21, the shortest no longer than the longest.",
      "Children are under 18; count older guests as adults.",
      "Give the budget as an amount, for example 3000.",
    ]);
  });
  it("checks the party against cabins the way the request form does", () => {
    const p = { ...emptyPlan(TODAY), adults: 3, childAges: "7" };
    expect(planProblems(p, TODAY)).toEqual(["A cabin sleeps at most 3 (infants under 3 don’t count). Ask for more cabins."]);
    expect(planProblems({ ...p, cabins: 2 }, TODAY)).toEqual([]);
    expect(planProblems({ ...p, childAges: "7, 1", adults: 2 }, TODAY)).toEqual([]);
    expect(planProblems({ ...p, adults: 1, childAges: "7", cabins: 2 }, TODAY)).toEqual([
      "Each cabin needs a guest aged 12 or over.",
    ]);
  });
  it("opens the request form with every field of the plan", () => {
    const p = {
      ...emptyPlan(TODAY),
      route: "Luxor→Aswan",
      childAges: "7, 4",
      budget: "3000",
      currency: "EUR" as const,
      notes: "Quiet cabin",
    };
    const href = requestHref(p);
    expect(href.startsWith("/dashboard/journey/requests/?")).toBe(true);
    expect(href.endsWith("#new")).toBe(true);
    const q = Object.fromEntries(new URLSearchParams(href.split("?")[1]!.replace("#new", "")));
    expect(requestDefaults(q, routes)).toEqual({
      route: "Luxor→Aswan",
      earliest: "2026-11-20",
      latest: "2026-12-20",
      nights: undefined,
      nightsMin: 3,
      nightsMax: 7,
      adults: 2,
      childAges: "7, 4",
      cabins: 1,
      budget: "3000",
      currency: "EUR",
      notes: "Quiet cabin",
    });
  });
  it("ignores a route we don't sail and anything malformed in the address", () => {
    expect(requestDefaults({ route: "Cairo→Aswan", adults: "99", children: "x", cur: "GBP" }, routes)).toMatchObject({
      route: undefined,
      adults: undefined,
      childAges: undefined,
      currency: undefined,
    });
  });
  it("reads a saved plan back, or nothing when it's damaged", () => {
    expect(readPlan(JSON.stringify({ ...emptyPlan(TODAY), adults: 3 }), TODAY)?.adults).toBe(3);
    expect(readPlan("{not json", TODAY)).toBeNull();
    expect(readPlan(null, TODAY)).toBeNull();
  });
});

describe("emails from notices (DASH-BND-007, ADR-101)", () => {
  const n = { kind: "offer.new", title: "New offer for your Luxor to Aswan request", link: "/dashboard/journey/offers/abc/" };
  it("uses the notice as the subject and links to the page", () => {
    const m = noticeEmail(n, "https://nilecruz.example", "person");
    expect(m.subject).toBe(n.title);
    expect(m.text).toContain("Open it to compare the offer and accept it before it expires.");
    expect(m.text).toContain("https://nilecruz.example/dashboard/journey/offers/abc/");
    expect(m.text).toContain("https://nilecruz.example/account/security/#sec-emails");
    expect(m.html).toContain('href="https://nilecruz.example/dashboard/journey/offers/abc/"');
  });
  it("escapes HTML", () => {
    expect(noticeEmail({ ...n, title: "<b>x</b>" }, "https://x", "company").html).not.toContain("<b>x</b>");
  });
  it("keeps bookings, payments and cancellations always on; only updates are optional", () => {
    expect(OPTIONAL_KINDS.has("offer.updated")).toBe(true);
    for (const k of ["reservation.new", "payment.deadline", "cancellation.approved", "booking_request.declined"])
      expect(OPTIONAL_KINDS.has(k)).toBe(false);
  });
  it("doesn't email operators twice about booking requests, nor admins about escalations", () => {
    expect(emailedElsewhere("booking_request.new", "operator")).toBe(true);
    expect(emailedElsewhere("booking_request.new", "partner")).toBe(false);
    expect(emailedElsewhere("booking_request.escalation", "nilecruz")).toBe(true);
  });
  it("sends money matters to finance staff too", () => {
    expect(rolesFor("payment.deadline")).toContain("finance");
    expect(rolesFor("offer.new")).not.toContain("finance");
  });
});
