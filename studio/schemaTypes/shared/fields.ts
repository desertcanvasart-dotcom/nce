import { defineField } from "sanity";

/** Hidden language field managed by @sanity/document-internationalization. */
export const languageField = defineField({ name: "language", type: "string", readOnly: true, hidden: true });

/** CLAUDE.md §6: seeded or illustrative content always carries a visible "Sample data" flag on the site. */
export const sampleField = defineField({
  name: "sample",
  title: "Sample data",
  type: "boolean",
  description: "Tick while figures or text are placeholders. The site then shows a “Sample data” flag.",
  initialValue: true,
});

export const slugField = defineField({
  name: "slug",
  type: "slug",
  description: "Lower-case English letters, numbers and hyphens, also for Spanish and Japanese pages.",
  options: { source: "title", maxLength: 80 },
  validation: (rule) =>
    rule
      .required()
      .custom((value) =>
        !value?.current || /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value.current)
          ? true
          : "Use lower-case English letters, numbers and single hyphens.",
      ),
});

export const seoFields = [
  defineField({
    name: "seoTitle",
    title: "Search title",
    type: "string",
    description: "Shown in search results. Keep under 60 characters.",
    validation: (rule) => rule.max(60).warning("Search engines cut titles after about 60 characters."),
  }),
  defineField({
    name: "seoDescription",
    title: "Search description",
    type: "text",
    rows: 3,
    validation: (rule) => rule.max(160).warning("Keep under about 160 characters."),
  }),
];

/** House-style check (BRAND-001/002): no "best", "unbeatable", "once in a lifetime", exclamation marks or emoji. */
const BANNED = [/\bbest\b(?!\s+for\b)/i, /\bunbeatable\b/i, /once in a lifetime/i, /[!！]/, /\p{Extended_Pictographic}/u];
export const houseStyle = (value: unknown) => {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? "");
  const hit = BANNED.find((re) => re.test(text));
  return hit ? "House style: no superlatives such as “best”, no exclamation marks, no emoji." : true;
};
