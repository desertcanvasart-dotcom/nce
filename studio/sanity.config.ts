import { documentInternationalization } from "@sanity/document-internationalization";
import { visionTool } from "@sanity/vision";
import { defineConfig, type Template } from "sanity";
import { internationalizedArray } from "sanity-plugin-internationalized-array";
import { structureTool } from "sanity/structure";
import { dataset, projectId } from "./env";
import { BASE_LOCALE, DOCUMENT_LOCALISED_TYPES, LOCALES } from "./locales";
import { schemaTypes } from "./schemaTypes";

export default defineConfig({
  name: "nilecruz",
  title: "Nilecruz",
  projectId,
  dataset,
  plugins: [
    structureTool(),
    // Whole-document translations, each language published on its own (I18N-011).
    documentInternationalization({
      supportedLanguages: [...LOCALES],
      schemaTypes: DOCUMENT_LOCALISED_TYPES,
    }),
    // Field-level translations for records whose figures and photos are shared across languages.
    internationalizedArray({
      languages: [...LOCALES],
      defaultLanguages: [BASE_LOCALE],
      fieldTypes: ["string", "text"],
    }),
    visionTool(),
  ],
  schema: {
    types: schemaTypes,
    templates: (prev): Template[] => [
      ...prev,
      ...DOCUMENT_LOCALISED_TYPES.map((schemaType) => ({
        id: `${schemaType}-${BASE_LOCALE}`,
        title: `${schemaType} (English)`,
        schemaType,
        parameters: [{ name: "language", type: "string" }],
        value: ({ language }: { language: string }) => ({ language }),
      })),
    ],
  },
  document: {
    // New localised documents always start in English; translations are made from the document itself.
    newDocumentOptions: (prev) => [
      ...prev.filter((item) => !DOCUMENT_LOCALISED_TYPES.includes(item.templateId)),
      ...DOCUMENT_LOCALISED_TYPES.map((schemaType) => ({
        templateId: `${schemaType}-${BASE_LOCALE}`,
        parameters: { language: BASE_LOCALE },
      })),
    ],
  },
});
