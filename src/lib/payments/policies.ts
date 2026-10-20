import type { CancellationBand } from "@/lib/tours/tours";

/**
 * Nilecruz's two standard cruise cancellation policies (Faris, 19 Oct 2026; CONTENT-NEEDED #4).
 * Operators start from one and save it; the bands are listed in words on the page, so the wording only explains them.
 * The Spanish and Japanese were reviewed by native speakers and approved on 20 Oct 2026 (ADR-094); they are the reviewed
 * texts from docs/drafts/cruise-cancellation-policies.md, ending where the list of bands begins (the page lists them).
 */
export type PolicyPreset = "luxury" | "standard";

const WORDING =
  "If you cancel, a share of the whole cruise price is charged, depending on how many days before check-in (the departure date) we receive your cancellation; the bands are listed below. Days are counted in Cairo calendar days, up to the departure date. Anything you have paid beyond the charge is refunded.";

const WORDING_ES =
  "Si cancela, se cobra un porcentaje del precio total del crucero, según los días que falten para el embarque cuando recibamos su cancelación. Los días se cuentan como días naturales en horario de El Cairo, hasta la fecha de salida. Le reembolsamos lo que haya pagado por encima de los gastos de cancelación.";

const WORDING_JA =
  "ご予約をキャンセルされる場合、キャンセルのご連絡を受け付けた日がご乗船日の何日前かに応じて、クルーズ代金総額に対する以下の割合をキャンセル料として申し受けます。日数はカイロ時間の暦日で、出発日まで数えます。お支払い済みの金額のうち、キャンセル料を超える分を返金いたします。";

export const STANDARD_POLICIES: Record<
  PolicyPreset,
  { label: string; bands: CancellationBand[]; en: string; es: string; ja: string }
> = {
  luxury: {
    label: "Luxury and branded vessels",
    bands: [
      { from_days: 181, percent: 0 },
      { from_days: 121, percent: 15 },
      { from_days: 91, percent: 50 },
      { from_days: 0, percent: 100 },
    ],
    en: WORDING,
    es: WORDING_ES,
    ja: WORDING_JA,
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
    es: WORDING_ES,
    ja: WORDING_JA,
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
