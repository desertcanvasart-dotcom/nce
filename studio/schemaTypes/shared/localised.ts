import type { Rule } from "sanity";

type LocalisedValue = { _key?: string; language?: string; value?: unknown }[] | undefined;

/** Field-level translations: English is required; Spanish and Japanese fall back to English on the site (I18N-011). */
export const requireEnglish = (rule: Rule) =>
  rule.custom((value: LocalisedValue) => {
    const en = value?.find((v) => (v.language ?? v._key) === "en");
    return en && typeof en.value === "string" && en.value.trim() ? true : "English is required.";
  });
