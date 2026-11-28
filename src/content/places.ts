import type { Locale } from "@/i18n/routing";

/** The language data-driven words are shown in: Japanese on /ja/; English elsewhere (Spanish shows English for now). */
export const contentLocale = (locale: string): Extract<Locale, "en" | "ja"> => (locale === "ja" ? "ja" : "en");

/** Place names as the catalogue writes them, in Japanese. Ids and filters keep the English; only what is shown changes. */
const JA: Record<string, string> = {
  Luxor: "ルクソール",
  Aswan: "アスワン",
  Esna: "エスナ",
  Edfu: "エドフ",
  "El Kab": "エル・カブ",
  "Kom Ombo": "コム・オンボ",
  "Gebel Silsila": "ゲベル・シルシラ",
  "Abu Simbel": "アブ・シンベル",
  Cairo: "カイロ",
  Dendera: "デンデラ",
  Abydos: "アビドス",
  "High Dam": "アスワン・ハイ・ダム",
  "Lake Nasser": "ナセル湖",
};

export const placeName = (name: string, locale: string = "en"): string => (locale === "ja" ? (JA[name] ?? name) : name);
