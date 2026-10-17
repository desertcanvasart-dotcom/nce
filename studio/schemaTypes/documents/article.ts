import { DocumentTextIcon } from "@sanity/icons/DocumentText";
import { defineField, defineType } from "sanity";
import { houseStyle, languageField, sampleField, seoFields, slugField } from "../shared/fields";

/** Guides and articles (the /guide/ silo). Translated as whole documents. */
export const article = defineType({
  name: "article",
  title: "Article",
  type: "document",
  icon: DocumentTextIcon,
  groups: [
    { name: "content", title: "Content", default: true },
    { name: "seo", title: "Search" },
  ],
  fields: [
    languageField,
    defineField({
      name: "title",
      type: "string",
      group: "content",
      validation: (rule) => rule.required().max(110).custom(houseStyle),
    }),
    { ...slugField, group: "content" },
    defineField({
      name: "standfirst",
      title: "Standfirst",
      type: "text",
      rows: 3,
      group: "content",
      description: "One or two sentences under the title: what the reader will learn.",
      validation: (rule) => rule.required().max(280).custom(houseStyle),
    }),
    defineField({ name: "heroImage", title: "Main photo", type: "figure", group: "content" }),
    defineField({ name: "body", type: "richText", group: "content", validation: (rule) => rule.required() }),
    defineField({
      name: "vesselTypes",
      title: "About these vessel types",
      type: "array",
      group: "content",
      of: [{ type: "string" }],
      options: { list: ["sail", "motor", "steam"], layout: "grid" },
    }),
    defineField({
      name: "reviewedBy",
      title: "Checked by",
      type: "reference",
      to: [{ type: "egyptologist" }],
      group: "content",
      description: "The Egyptologist who checked the history in this piece.",
    }),
    defineField({ name: "publishedAt", type: "datetime", group: "content" }),
    defineField({ name: "updatedAt", title: "Last reviewed", type: "datetime", group: "content" }),
    { ...sampleField, group: "content" },
    ...seoFields.map((f) => ({ ...f, group: "seo" })),
  ],
  preview: { select: { title: "title", subtitle: "language" } },
});
