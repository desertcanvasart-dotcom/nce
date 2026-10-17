import { HelpCircleIcon } from "@sanity/icons/HelpCircle";
import { defineField, defineType } from "sanity";
import { houseStyle, languageField, sampleField } from "../shared/fields";

/** One question and its answer (FAQPage schema where the silo asks for it). */
export const faq = defineType({
  name: "faq",
  title: "FAQ",
  type: "document",
  icon: HelpCircleIcon,
  fields: [
    languageField,
    defineField({ name: "question", type: "string", validation: (rule) => rule.required().max(200).custom(houseStyle) }),
    defineField({ name: "answer", type: "richText", validation: (rule) => rule.required() }),
    defineField({
      name: "topic",
      type: "string",
      options: {
        list: [
          { title: "Choosing a vessel", value: "vessels" },
          { title: "Prices and payment", value: "payment" },
          { title: "On board", value: "on-board" },
          { title: "Route and sights", value: "route" },
          { title: "Families and access", value: "families" },
          { title: "Booking and changes", value: "booking" },
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({ name: "order", type: "number", validation: (rule) => rule.integer().min(0) }),
    sampleField,
  ],
  orderings: [
    {
      title: "Topic, then order",
      name: "topicOrder",
      by: [
        { field: "topic", direction: "asc" },
        { field: "order", direction: "asc" },
      ],
    },
  ],
  preview: { select: { title: "question", subtitle: "language" } },
});
