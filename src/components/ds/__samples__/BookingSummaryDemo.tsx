"use client";

import { useState } from "react";
import { BookingSummary } from "../BookingSummary/BookingSummary";
import { formatMoney } from "../lib/format";
import { Stepper } from "../Stepper/Stepper";

/**
 * Gallery-only demo: recomputes sample lines when guests change, applying the default child-price bands
 * (ADR-012: under 3 free, 3–5 25%, 6–11 50%) to a SAMPLE adult rate. The real pricing function is built in Batch 4c.
 */
export function BookingSummaryDemo({ childAges = [] as number[] }: { childAges?: number[] }) {
  const [adults, setAdults] = useState(2);
  const rate = 189000; // sample: US$1,890 per adult, minor units
  const share = (age: number) => (age < 3 ? 0 : age < 6 ? 0.25 : age < 12 ? 0.5 : 1);
  const lines = [
    {
      label: `${formatMoney({ amount: rate, currency: "USD" })} × ${adults}`,
      amount: { amount: rate * adults, currency: "USD" },
    },
    ...childAges.map((age, i) => ({
      label: `Child ${i + 1}, age ${age}`,
      amount: { amount: Math.round(rate * share(age)), currency: "USD" },
    })),
  ];
  const total = lines.reduce((s, l) => s + l.amount.amount, 0);
  const paying = adults + childAges.filter((a) => a >= 3).length;
  return (
    <BookingSummary
      vesselName="Dahabiya Meroe"
      cabinName="Junior suite"
      departure="2027-02-12"
      nights={4}
      guests={
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Adults</span>
          <Stepper label="adults" min={1} max={4} value={adults} onChange={setAdults} />
        </div>
      }
      lines={lines}
      total={{ amount: total, currency: "USD" }}
      gratuity={{ perPersonPerNight: { amount: 500, currency: "USD" }, payingGuests: paying, nights: 4 }}
      extras={[{ label: "Airport and hotel transfers", href: "/tours-extras/transfers/" }]}
      policyNote="Sample policy text. The real note states this departure's payment deadline and cancellation policy."
      requestHref="/plan-my-cruise/"
    />
  );
}
