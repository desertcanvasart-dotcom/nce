/** The site's languages (I18N-001). English is the base; Spanish and Japanese are translations. Keep in step with src/i18n/routing.ts. */
export const LOCALES = [
  { id: "en", title: "English" },
  { id: "es", title: "Español" },
  { id: "ja", title: "日本語" },
] as const;
export const BASE_LOCALE = "en";

/** Editorial pieces translated as whole documents, each language published on its own. */
export const DOCUMENT_LOCALISED_TYPES = ["article", "faq", "destinationStory", "vesselTypeProfile"];
