import { describe, expect, it } from "vitest";
import { formatDate, formatMoney, formatNights } from "@/components/ds/lib/format";

describe("brand formats (BRAND-005/006/007, I18N-010)", () => {
  it("formats money from minor units with an unambiguous currency label", () => {
    expect(formatMoney({ amount: 124000, currency: "USD" })).toBe("US$1,240");
    expect(formatMoney({ amount: 124050, currency: "USD" })).toBe("US$1,240.50");
    expect(formatMoney({ amount: 95000, currency: "EUR" })).toBe("€950");
    expect(formatMoney({ amount: 120000, currency: "JPY" })).toBe("¥120,000");
  });
  it("follows each locale's number conventions", () => {
    expect(formatMoney({ amount: 124000, currency: "USD" }, "ja")).toBe("US$1,240");
    expect(formatMoney({ amount: 1234500, currency: "USD" }, "es")).toBe("12.345 US$");
  });
  it("writes dates as 12 Feb 2027 in English", () => {
    expect(formatDate("2027-02-12")).toBe("12 Feb 2027");
    expect(formatDate("2027-02-12", "ja")).toBe("2027年2月12日");
  });
  it("writes durations in nights, never days", () => {
    expect(formatNights(4)).toBe("4 nights");
    expect(formatNights(1)).toBe("1 night");
    expect(formatNights(3, "es")).toBe("3 noches");
    expect(formatNights(3, "ja")).toBe("3泊");
  });
});
