import { CalendarIcon } from "@sanity/icons/Calendar";
import { defineField, defineType } from "sanity";
import { houseStyle, languageField, sampleField, seoFields, slugField } from "../shared/fields";

/** Keep in step with BLOG_TOPICS in src/lib/content/blog.ts. */
const TOPICS = [
  { title: "News", value: "news" },
  { title: "Seasons", value: "seasons" },
  { title: "Vessels", value: "vessels" },
  { title: "Egyptology", value: "egyptology" },
  { title: "Trip stories", value: "trip-stories" },
];

/**
 * Blog posts (ADR-105): dated pieces at /blog/{slug}/. Evergreen advice belongs in the guide (`article`), so every post
 * links up to one guide page. Translated as whole documents.
 */
export const post = defineType({
  name: "post",
  title: "Blog post",
  type: "document",
  icon: CalendarIcon,
  groups: [
    { name: "content", title: "Content", default: true },
    { name: "seo", title: "Search" },
  ],
  fields: [
    languageField,
    defineField({
      name: "reviewStatus",
      title: "Review",
      type: "string",
      group: "content",
      description: "Only approved posts appear on the site.",
      options: {
        list: [
          { title: "Draft for review", value: "draft" },
          { title: "Approved", value: "approved" },
        ],
        layout: "radio",
      },
      initialValue: "draft",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "title",
      type: "string",
      group: "content",
      validation: (rule) => rule.required().max(110).custom(houseStyle),
    }),
    {
      ...slugField,
      group: "content",
      validation: (rule) =>
        rule
          .required()
          .custom((value: { current?: string } | undefined) =>
            !value?.current || /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value.current)
              ? value?.current === "topics"
                ? "“topics” is taken by the topic pages."
                : true
              : "Use lower-case English letters, numbers and single hyphens.",
          ),
    },
    defineField({
      name: "topic",
      type: "string",
      group: "content",
      options: { list: TOPICS, layout: "radio" },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "standfirst",
      title: "Standfirst",
      type: "text",
      rows: 3,
      group: "content",
      description: "One or two sentences under the title: what happened, or what the reader will learn.",
      validation: (rule) => rule.required().max(280).custom(houseStyle),
    }),
    defineField({ name: "body", type: "richText", group: "content", validation: (rule) => rule.required() }),
    defineField({
      name: "guidePage",
      title: "Guide page this post leads to",
      type: "string",
      group: "content",
      description:
        "The address of the guide, vessels, prices or destinations page this post supports, e.g. /nile-cruise-guide/when-to-go/. The post links to it, so it passes readers on to the guide.",
      validation: (rule) =>
        rule.required().regex(/^\/(nile-cruise-guide|nile-cruise-prices|vessels|destinations|tours-extras)\/([a-z0-9-]+\/)*$/, {
          name: "guide address",
        }),
    }),
    defineField({
      name: "vesselTypes",
      title: "About these vessel types",
      type: "array",
      group: "content",
      description: "Picks the illustration and the cruises shown at the end.",
      of: [{ type: "string" }],
      options: { list: ["sail", "motor", "steam"], layout: "grid" },
    }),
    defineField({
      name: "author",
      type: "string",
      group: "content",
      description: "Who wrote it, as it should appear. Leave empty for “Nilecruz”.",
      validation: (rule) => rule.max(80),
    }),
    defineField({
      name: "reviewedBy",
      title: "Checked by",
      type: "reference",
      to: [{ type: "egyptologist" }],
      group: "content",
      description: "The Egyptologist who checked the history in this post.",
    }),
    defineField({
      name: "faqs",
      title: "Questions on this post",
      type: "array",
      group: "content",
      description: "Shown at the end of the post and as FAQPage data.",
      of: [
        {
          type: "object",
          name: "postFaq",
          fields: [
            defineField({ name: "question", type: "string", validation: (rule) => rule.required().max(200).custom(houseStyle) }),
            defineField({ name: "answer", type: "richText", validation: (rule) => rule.required() }),
          ],
          preview: { select: { title: "question" } },
        },
      ],
    }),
    defineField({
      name: "publishedAt",
      title: "Published",
      type: "datetime",
      group: "content",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "updatedAt",
      title: "Last updated",
      type: "datetime",
      group: "content",
      description: "Set when the post is corrected or brought up to date.",
    }),
    { ...sampleField, group: "content" },
    ...seoFields.map((f) => ({ ...f, group: "seo" })),
  ],
  orderings: [{ title: "Newest first", name: "publishedDesc", by: [{ field: "publishedAt", direction: "desc" }] }],
  preview: { select: { title: "title", subtitle: "topic" } },
});
