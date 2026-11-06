import { describe, expect, it } from "vitest";
import {
  DEFAULT_PRICE_DATA,
  priceMessage,
  publicPrice,
  sellsThroughUs,
  showsSignedInPrice,
  sortAmount,
  type PublicPriceData,
} from "@/lib/marketplace/public-price";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import ja from "../../messages/ja.json";
import { formatMoney } from "@/components/ds/lib/format";

const today = "2026-11-06";
const royalLily: PublicPriceData = {
  ...DEFAULT_PRICE_DATA,
  publicPriceMode: "from_price",
  fromPriceAmount: 112000,
  priceBasis: "per_person_per_trip",
  priceLastChecked: "2026-11-06",
  operatorPriceApproved: true,
};

describe("public starting prices (ADR-109)", () => {
  it("safe defaults: price on request, and an adviser's offer by email", () => {
    expect(DEFAULT_PRICE_DATA.publicPriceMode).toBe("on_request");
    expect(DEFAULT_PRICE_DATA.rateDisplayAfterRequest).toBe("offer_by_adviser");
    expect(DEFAULT_PRICE_DATA.operatorPriceApproved).toBe(false);
    expect(publicPrice(DEFAULT_PRICE_DATA, today)).toEqual({ mode: "on_request" });
    expect(publicPrice(null, today)).toEqual({ mode: "on_request" });
  });

  it("shows an approved euro 'from' price with its basis and the day it was last checked", () => {
    expect(publicPrice(royalLily, today)).toEqual({
      mode: "from_price",
      from: { amount: 112000, currency: "EUR" },
      basis: "per_person_per_trip",
      nights: null,
      lastChecked: "2026-11-06",
      margin: true,
    });
  });

  it("says when a figure isn't yet confirmed to include our margin (the Nour El Nil boats, 6 Nov 2026)", () => {
    const p = publicPrice({ ...royalLily, priceIncludesMargin: false }, today);
    expect(p.mode === "from_price" && p.margin).toBe(false);
    expect(priceMessage(p, () => "€2,500").key).toBe("level1.fromGuide");
    expect(priceMessage(publicPrice(royalLily, today), () => "€1,120").key).toBe("level1.from");
  });

  it("only a vessel Nilecruz can sell is sold through us (Steam Ship Sudan isn't)", () => {
    expect(sellsThroughUs("not_available_through_nilecruz")).toBe(false);
    expect(sellsThroughUs("available_through_nilecruz")).toBe(true);
    expect(sellsThroughUs(undefined)).toBe(true);
  });

  it("without the operator's approval, says 'Price on request'", () => {
    expect(publicPrice({ ...royalLily, operatorPriceApproved: false }, today).mode).toBe("on_request");
  });

  it("shows no figure when the price is missing, expired, not yet valid, unchecked or not in euros", () => {
    const off = (over: Partial<PublicPriceData>) => publicPrice({ ...royalLily, ...over }, today).mode;
    expect(off({ fromPriceAmount: null })).toBe("on_request");
    expect(off({ priceValidTo: "2026-11-05" })).toBe("on_request");
    expect(off({ priceValidFrom: "2026-11-07" })).toBe("on_request");
    expect(off({ priceLastChecked: null })).toBe("on_request");
    expect(off({ priceBasis: null })).toBe("on_request");
    expect(off({ priceCurrency: "USD" })).toBe("on_request");
    expect(off({ priceValidTo: today })).toBe("from_price"); // valid through its last day
  });

  it("shows a band only when both ends are there and in order", () => {
    const band = { ...royalLily, publicPriceMode: "price_band" as const, priceBandMin: 90000, priceBandMax: 140000 };
    expect(publicPrice(band, today)).toMatchObject({ mode: "price_band", min: { amount: 90000 }, max: { amount: 140000 } });
    expect(publicPrice({ ...band, priceBandMax: 80000 }, today).mode).toBe("on_request");
    expect(publicPrice({ ...band, priceBandMin: null }, today).mode).toBe("on_request");
  });

  it("never gives a per-trip price a nightly basis, and states nights only when the data has them", () => {
    expect(publicPrice({ ...royalLily, priceTripNights: 4 }, today)).toMatchObject({ nights: 4 });
    expect(publicPrice({ ...royalLily, priceBasis: "per_person_per_night", priceTripNights: 4 }, today)).toMatchObject({
      basis: "per_person_per_night",
      nights: null,
    });
  });

  it("sorts by the lowest figure; 'Price on request' has none", () => {
    expect(sortAmount(publicPrice(royalLily, today))).toBe(112000);
    expect(sortAmount({ mode: "on_request" })).toBeNull();
  });

  it("shows a signed-in price only where the vessel has it set and can be booked", () => {
    expect(showsSignedInPrice("offer_by_adviser", true)).toBe(false);
    expect(showsSignedInPrice("signed_in_price", false)).toBe(false);
    expect(showsSignedInPrice("signed_in_price", true)).toBe(true);
  });

  it("uses the brief's exact English sentences", () => {
    const m = (k: string) => k.split(".").reduce<unknown>((o, x) => (o as Record<string, unknown>)[x], en.pricing) as string;
    const strip = (s: string) => s.replace(/<\/?b>/g, "");
    const money = (a: number) => formatMoney({ amount: a, currency: "EUR" }, "en");
    const { key, values } = priceMessage(publicPrice(royalLily, today), (x) => formatMoney(x, "en"));
    expect(strip(m(key.replace("level1.", "")).replace("{price}", values.price!))).toBe(
      "From €1,120 per person. Includes our margin. A guide, not a quote.",
    );
    expect(strip(en.pricing.band.replace("{min}", money(90000)).replace("{max}", money(140000)))).toBe(
      "Typically €900–€1,400 per person. Includes our margin. A guide, not a quote.",
    );
    expect(en.pricing.onRequest).toBe("Price on request");
    expect(en.pricing.policy).toBe("All prices we publish and quote already include our margin.");
    expect(en.pricing.rates.title).toBe("Check rates for your dates");
    expect(en.pricing.rates.lead).toBe("We’ll check availability and send your offer by email.");
    expect(en.pricing.save.title).toBe("Save this quote and get an alert if the price changes.");
    expect(en.pricing.gratuities).toContain(
      "usually €5 to €10 per person, per night, depending on the cruise. Check each cruise’s offer.",
    );
  });

  it("formats euros the local way: €1,240 in English, 1.240 € in Spanish, €1,240 in Japanese", () => {
    const eur = { amount: 124000, currency: "EUR" };
    expect(formatMoney(eur, "en")).toBe("€1,240");
    expect(formatMoney(eur, "es")).toBe("1.240 €");
    expect(formatMoney({ amount: 1240000, currency: "EUR" }, "es")).toBe("12.400 €");
    expect(formatMoney(eur, "ja")).toBe("€1,240");
  });

  it("has every price text in Spanish and Japanese, with no dollar sign", () => {
    const keys = (o: object, p = ""): string[] =>
      Object.entries(o).flatMap(([k, v]) => (typeof v === "object" ? keys(v, `${p}${k}.`) : [`${p}${k}`]));
    expect(keys(es.pricing)).toEqual(keys(en.pricing));
    expect(keys(ja.pricing)).toEqual(keys(en.pricing));
    for (const m of [en, es, ja]) expect(JSON.stringify(m)).not.toMatch(/US\$|USD/);
  });
});
