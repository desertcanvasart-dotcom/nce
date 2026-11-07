/**
 * The price page's example (Islam's pricing brief, 6 Nov 2026; ADR-109): how one cruise price builds up, per person,
 * in euros, already including Nilecruz's margin. A guide, not a quote: it names no boat, and the total is always the
 * sum of the steps, never typed in. Crew gratuities, flights and transfers are never in it (ADR-010, 011).
 */
export type PriceStep = { label: string; detail?: string; amount: number };

const eur = (euros: number) => euros * 100;

export const PRICE_EXAMPLE_TITLE = "Example: how a price builds up. A guide, not a quote.";

export const PRICE_EXAMPLE: PriceStep[] = [
  { label: "Starting price", amount: eur(400) },
  { label: "Better boat with fewer guests", amount: eur(800) },
  { label: "Better sightseeing and guiding", amount: eur(300) },
  { label: "Cabin", detail: "Standard cabin", amount: eur(0) },
  { label: "Season", detail: "Regular season", amount: eur(0) },
];

export const priceExampleTotal = (steps: PriceStep[] = PRICE_EXAMPLE) => steps.reduce((sum, s) => sum + s.amount, 0);
