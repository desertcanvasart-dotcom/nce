import type { PriceFactor } from "@/components/ds/PriceAnatomy/PriceAnatomy";

/**
 * DATA-008, ADR-096: how a Nile cruise price is built, per person for a 4-night Luxor–Aswan cruise in US$.
 * The amounts are illustrative estimates, flagged "Sample data" with an honest footnote, until enough operators' real
 * rates are in the catalogue to derive them. Gratuities, flights and transfers are never in these totals (ADR-010, 011).
 */
const usd = (dollars: number) => dollars * 100;

export const PRICE_FACTORS: PriceFactor[] = [
  {
    id: "vessel",
    label: "Who shares the boat",
    icon: "users",
    options: [
      {
        label: "Large motor ship, about 140 guests",
        amount: usd(500),
        why: "The cost of running the ship is shared by many guests.",
      },
      {
        label: "Smaller ship, about 60 guests",
        amount: usd(1100),
        why: "Fewer guests share the same running costs, with more crew each.",
      },
      { label: "Dahabiya, about 12 guests", amount: usd(2200), why: "A handful of guests carry a whole boat and its crew." },
    ],
  },
  {
    id: "cabin",
    label: "Cabin",
    icon: "ruler",
    options: [
      { label: "Standard cabin", amount: 0, why: "A window onto the river, twin beds and a shower." },
      { label: "Larger cabin or junior suite", amount: usd(600), why: "More room, often on an upper deck, sometimes a balcony." },
      { label: "Suite", amount: usd(1800), why: "A sitting area and the best position on the boat." },
    ],
  },
  {
    id: "guide",
    label: "Sightseeing",
    icon: "egyptologist",
    options: [
      { label: "Shared guide, large groups", amount: usd(100), why: "Visits in a big group at fixed times." },
      { label: "Small group", amount: usd(300), why: "Fewer people per guide, more time at each site." },
      { label: "Private Egyptologist", amount: usd(800), why: "Your own guide, at your pace." },
    ],
  },
  {
    id: "season",
    label: "When you sail",
    icon: "calendar",
    options: [
      { label: "Summer (May–September)", amount: 0, why: "Hot, quiet and the lowest prices." },
      { label: "Cooler season (October–April)", amount: usd(300), why: "The main season: mild weather and more demand." },
      { label: "Christmas and New Year", amount: usd(900), why: "The busiest weeks of the year." },
    ],
  },
];

export const PRICE_PRESETS = {
  low: [0, 0, 0, 0],
  high: [2, 2, 2, 1],
  lowLabel: "Large ship, summer",
  highLabel: "Dahabiya suite, winter",
};

export const PRICE_FOOTNOTE =
  "Illustrative figures per person for a 4-night Luxor–Aswan cruise, to show how prices are built. They are not quotes. They are marked as sample data until enough operators’ real rates are in our catalogue to calculate them. Crew gratuities, flights and transfers are never included.";
