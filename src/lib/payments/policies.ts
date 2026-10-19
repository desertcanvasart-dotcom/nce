import type { CancellationBand } from "@/lib/tours/tours";

/**
 * Nilecruz's two standard cruise cancellation policies (Faris, 19 Oct 2026; CONTENT-NEEDED #4).
 * Operators start from one and save it; the bands are listed in words on the page, so the wording only explains them.
 * Spanish and Japanese drafts are in docs/drafts/cruise-cancellation-policies.md, waiting for a native speaker.
 */
export type PolicyPreset = "luxury" | "standard";

const WORDING =
  "If you cancel, a share of the whole cruise price is charged, depending on how many days before check-in (the departure date) we receive your cancellation; the bands are listed below. Days are counted in Cairo calendar days, up to the departure date. Anything you have paid beyond the charge is refunded.";

export const STANDARD_POLICIES: Record<PolicyPreset, { label: string; bands: CancellationBand[]; en: string }> = {
  luxury: {
    label: "Luxury and branded vessels",
    bands: [
      { from_days: 181, percent: 0 },
      { from_days: 121, percent: 15 },
      { from_days: 91, percent: 50 },
      { from_days: 0, percent: 100 },
    ],
    en: WORDING,
  },
  standard: {
    label: "All other vessels",
    bands: [
      { from_days: 121, percent: 0 },
      { from_days: 91, percent: 25 },
      { from_days: 60, percent: 35 },
      { from_days: 30, percent: 50 },
      { from_days: 0, percent: 100 },
    ],
    en: WORDING,
  },
};

/** The brands whose ships take the luxury policy. */
export const LUXURY_BRANDS = ["Sonesta", "Mövenpick", "Oberoi", "Historia", "Solai", "Mayfair"] as const;

const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/** Which standard policy a vessel's name suggests: luxury when it carries one of the brands. */
export function suggestedPolicy(vesselName: string): PolicyPreset {
  const name = fold(vesselName);
  return LUXURY_BRANDS.some((b) => new RegExp(`\\b${fold(b)}\\b`).test(name)) ? "luxury" : "standard";
}
