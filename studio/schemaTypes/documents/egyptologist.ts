import { UserIcon } from "@sanity/icons/User";
import { defineField, defineType } from "sanity";
import { sampleField, slugField } from "../shared/fields";
import { requireEnglish } from "../shared/localised";

/**
 * Egyptologist profiles (DATA-044, PROPOSED-015 approved). Every fact comes from Faris or the guide;
 * nothing is invented, and profiles stay drafts until checked (CONTENT-NEEDED).
 */
export const egyptologist = defineType({
  name: "egyptologist",
  title: "Egyptologist",
  type: "document",
  icon: UserIcon,
  fields: [
    defineField({ name: "name", type: "string", description: "As the guide writes it.", validation: (rule) => rule.required() }),
    { ...slugField, options: { source: "name", maxLength: 80 } },
    defineField({
      name: "photo",
      type: "image",
      options: { hotspot: true },
      fields: [
        defineField({
          name: "alt",
          title: "Description for screen readers",
          type: "internationalizedArrayString",
          validation: requireEnglish,
        }),
        defineField({
          name: "consent",
          title: "The guide agreed to this photo being published",
          type: "boolean",
          validation: (rule) => rule.required(),
        }),
      ],
    }),
    defineField({
      name: "credentials",
      title: "Qualifications and licence",
      type: "internationalizedArrayString",
      validation: requireEnglish,
    }),
    defineField({ name: "bio", title: "Short biography", type: "internationalizedArrayText", validation: requireEnglish }),
    defineField({
      name: "languages",
      title: "Guides in",
      type: "array",
      of: [{ type: "string" }],
      options: { list: ["Arabic", "English", "Spanish", "Japanese", "French", "German", "Italian", "Russian", "Chinese"] },
    }),
    defineField({
      name: "specialities",
      type: "internationalizedArrayString",
      description: "For example “Ptolemaic temples” (comma-separated).",
    }),
    defineField({ name: "active", title: "Currently guiding with Nilecruz", type: "boolean", initialValue: false }),
    sampleField,
  ],
  preview: { select: { title: "name", media: "photo" } },
});
