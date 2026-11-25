import { describe, expect, it } from "vitest";
import { residentPrice } from "@/lib/marketplace/public-price";

const data = { amount: 1441000, basis: "per_person_per_night" as const, validTo: "2027-05-02", approved: true };

describe("the resident price (ADR-113)", () => {
  it("is shown in Egyptian pounds while approved and in date", () => {
    expect(residentPrice(data, "2027-05-02")).toEqual({
      from: { amount: 1441000, currency: "EGP" },
      basis: "per_person_per_night",
    });
  });

  it("is withheld when unapproved, expired, empty or without a basis", () => {
    expect(residentPrice({ ...data, approved: false }, "2026-11-25")).toBeNull();
    expect(residentPrice(data, "2027-05-03")).toBeNull();
    expect(residentPrice({ ...data, amount: null }, "2026-11-25")).toBeNull();
    expect(residentPrice({ ...data, basis: null }, "2026-11-25")).toBeNull();
    expect(residentPrice(null, "2026-11-25")).toBeNull();
  });
});
