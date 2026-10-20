import { describe, expect, it } from "vitest";
import {
  digestEmail,
  escalationEmail,
  requestEmail,
  shownLines,
  whatsappParams,
  type RequestSummary,
} from "@/lib/requests/message";
import { actionToken, LINK_DAYS, readToken, tokenHash } from "@/lib/requests/tokens";

const SECRET = "unit-test-secret-unit-test-secret-0123";
const ID = "11111111-2222-4333-8444-555555555555";
const NOW = 1_790_000_000;

describe("signed action links (ADR-099)", () => {
  it("carry the request, the action and a 7-day expiry, and verify", () => {
    const t = actionToken(SECRET, ID, "confirm", NOW);
    expect(readToken(SECRET, t, NOW + 60)).toEqual({
      ok: true,
      requestId: ID,
      action: "confirm",
      expiresAt: NOW + LINK_DAYS * 86_400,
    });
  });
  it("refuse a changed action, request or expiry, and another secret", () => {
    const t = actionToken(SECRET, ID, "decline", NOW);
    expect(readToken(SECRET, t.replace("~decline~", "~confirm~"), NOW)).toMatchObject({ ok: false, reason: "signature" });
    expect(readToken(SECRET, t.replace(ID, "11111111-2222-4333-8444-555555555556"), NOW)).toMatchObject({
      ok: false,
      reason: "signature",
    });
    const [id, act, exp, sig] = t.split("~");
    expect(readToken(SECRET, [id, act, Number(exp) + 86_400, sig].join("~"), NOW)).toMatchObject({
      ok: false,
      reason: "signature",
    });
    expect(readToken("another-secret-another-secret-012345", t, NOW)).toMatchObject({ ok: false, reason: "signature" });
    expect(readToken(SECRET, "nonsense", NOW)).toEqual({ ok: false, reason: "malformed" });
  });
  it("expire after 7 days but still name the request, so the page can show its answer", () => {
    const t = actionToken(SECRET, ID, "hold", NOW);
    expect(readToken(SECRET, t, NOW + LINK_DAYS * 86_400 + 1)).toEqual({ ok: false, reason: "expired", requestId: ID });
  });
  it("are stored only as a hash, the same for the same link", () => {
    const t = actionToken(SECRET, ID, "hold", NOW);
    expect(tokenHash(t)).toMatch(/^[0-9a-f]{64}$/);
    expect(tokenHash(t)).toBe(tokenHash(t));
    expect(tokenHash(t)).not.toBe(tokenHash(actionToken(SECRET, ID, "confirm", NOW)));
  });
});

const summary: RequestSummary = {
  reference: "NQ-ABCDEF",
  operator: "Sample Operator",
  vessel: "Sample Ship",
  origin: "Luxor",
  destination: "Aswan",
  departsOn: "2026-11-02",
  nights: 4,
  lines: [{ cabin: "Standard", count: 2 }],
  guests: 4,
  nationality: "GB",
  shown: [{ cabin: "Standard", available: 4, source: "manual", confirmedAt: "2026-10-30T10:00:00Z" }],
  createdAt: "2026-10-31T08:00:00Z",
};
const links = { confirm: "https://x/c", decline: "https://x/d", hold: "https://x/h", other: "https://x/o" };

describe("the operator's message", () => {
  it("names the ship, cruise, cabins, guests (count and nationality only) and the reference", () => {
    const m = requestEmail(summary, links, 6);
    expect(m.subject).toBe("Booking request NQ-ABCDEF: Sample Ship, Mon, 2 Nov 2026");
    expect(m.text).toContain("Cruise: Luxor to Aswan, embarking Mon, 2 Nov 2026, 4 nights");
    expect(m.text).toContain("Cabins: 2 × Standard");
    expect(m.text).toContain("Guests: 4 (lead guest's nationality: GB)");
    expect(m.text).toContain("Please answer within 6 hours.");
  });
  it("says what our data showed and how old it was", () => {
    expect(shownLines(summary)).toEqual(["Your manual entry from 30 Oct showed 4 Standard free."]);
    expect(shownLines({ ...summary, shown: [{ cabin: "Suite", available: null, source: null, confirmedAt: null }] })).toEqual([
      "We had no availability for Suite.",
    ]);
  });
  it("carries the four actions as links, in text and as buttons", () => {
    const m = requestEmail(summary, links, 6);
    for (const [label, href] of [
      ["Confirm", "https://x/c"],
      ["Decline", "https://x/d"],
      ["Hold 72h", "https://x/h"],
      ["Offer other", "https://x/o"],
    ]) {
      expect(m.text).toContain(`${label}: ${href}`);
      expect(m.html).toContain(`href="${href}"`);
    }
  });
  it("escapes what it puts in HTML", () => {
    expect(requestEmail({ ...summary, vessel: "<b>Ship</b>" }, links, 6).html).not.toContain("<b>Ship</b>");
  });
  it("gives WhatsApp the template's five values", () => {
    expect(whatsappParams(summary)).toEqual([
      "Sample Ship",
      "Luxor to Aswan, Mon, 2 Nov 2026, 4 nights",
      "2 × Standard",
      "4 (GB)",
      "Your manual entry from 30 Oct showed 4 Standard free.",
    ]);
  });
  it("asks Nilecruz to phone the operator at twice the reply time", () => {
    expect(escalationEmail(summary, 6, "https://x/admin").text).toContain(
      "hasn't answered booking request NQ-ABCDEF after 12 hours (reply time 6 hours)",
    );
  });
});

describe("the daily digest", () => {
  it("is skipped when nothing is open", () => {
    expect(digestEmail("Sample Operator", [], [])).toBeNull();
  });
  it("lists waiting requests and holds ending today", () => {
    const m = digestEmail(
      "Sample Operator",
      [{ reference: "NQ-AAAAAA", vessel: "Sample Ship", departsOn: "2026-11-02", link: "https://x/1" }],
      [{ reference: "NQ-BBBBBB", vessel: "Sample Ship", holdUntil: "2026-10-31T15:00:00Z", link: "https://x/2" }],
    )!;
    expect(m.subject).toBe("Nilecruz today: 1 waiting, 1 holds ending");
    expect(m.text).toContain("- NQ-AAAAAA · Sample Ship · Mon, 2 Nov 2026: https://x/1");
    expect(m.text).toContain("- NQ-BBBBBB · Sample Ship · until 31 Oct 17:00 Cairo: https://x/2");
  });
});
