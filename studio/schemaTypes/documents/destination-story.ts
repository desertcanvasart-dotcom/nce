import { PinIcon } from "@sanity/icons/Pin";
import { defineField, defineType } from "sanity";
import { houseStyle, languageField, sampleField, seoFields, slugField } from "../shared/fields";

/**
 * The editorial story of a place on the route. The place itself (name, map, photos) lives in the database;
 * `destinationSlug` joins the two (BRAND-009 names come from the database).
 */
export const destinationStory = defineType({
  name: "destinationStory",
  title: "Destination story",
  type: "document",
  icon: PinIcon,
  groups: [
    { name: "content", title: "Content", default: true },
    { name: "seo", title: "Search" },
  ],
  fields: [
    languageField,
    defineField({
      name: "destinationSlug",
      title: "Destination",
      type: "string",
      group: "content",
      description: "The destination's address name in the database, for example “luxor”.",
      validation: (rule) => rule.required().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
    }),
    defineField({
      name: "title",
      type: "string",
      group: "content",
      validation: (rule) => rule.required().max(110).custom(houseStyle),
    }),
    { ...slugField, group: "content" },
    defineField({
      name: "summary",
      type: "text",
      rows: 3,
      group: "content",
      validation: (rule) => rule.required().max(300).custom(houseStyle),
    }),
    defineField({ name: "heroImage", title: "Main photo", type: "figure", group: "content" }),
    defineField({ name: "body", type: "richText", group: "content" }),
    defineField({ name: "reviewedBy", title: "Checked by", type: "reference", to: [{ type: "egyptologist" }], group: "content" }),
    { ...sampleField, group: "content" },
    ...seoFields.map((f) => ({ ...f, group: "seo" })),
  ],
  preview: { select: { title: "title", subtitle: "language" } },
});
