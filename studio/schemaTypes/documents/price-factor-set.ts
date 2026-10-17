import { BarChartIcon } from "@sanity/icons/BarChart";
import { defineField, defineType } from "sanity";
import { sampleField } from "../shared/fields";
import { iconOptions } from "../shared/icons";
import { requireEnglish } from "../shared/localised";

type Factor = { options?: unknown[] };

/**
 * The data behind PriceAnatomy ("why US$800 vs US$8,000"). Figures are shared across languages, so the
 * labels are translated field by field. Amounts are whole minor units (cents) in `currency` (DATA-001).
 */
export const priceFactorSet = defineType({
  name: "priceFactorSet",
  title: "Price explainer",
  type: "document",
  icon: BarChartIcon,
  fields: [
    defineField({ name: "title", title: "Internal name", type: "string", validation: (rule) => rule.required() }),
    defineField({
      name: "currency",
      type: "string",
      initialValue: "USD",
      validation: (rule) => rule.required().regex(/^[A-Z]{3}$/, { name: "ISO 4217 code" }),
    }),
    defineField({ name: "eyebrow", type: "internationalizedArrayString" }),
    defineField({
      name: "totalLabel",
      title: "What the total is",
      type: "internationalizedArrayString",
      description: "For example “per person, 4–5 nights”.",
      validation: requireEnglish,
    }),
    defineField({ name: "note", type: "internationalizedArrayText" }),
    defineField({
      name: "footnote",
      title: "Where the figures come from, and when",
      type: "internationalizedArrayText",
      validation: requireEnglish,
    }),
    defineField({ name: "asOf", title: "Figures checked on", type: "date", validation: (rule) => rule.required() }),
    defineField({
      name: "factors",
      type: "array",
      of: [
        {
          type: "object",
          name: "factor",
          fields: [
            defineField({ name: "id", type: "string", validation: (rule) => rule.required().regex(/^[a-z][a-z0-9-]*$/) }),
            defineField({ name: "icon", type: "string", options: { list: iconOptions }, validation: (rule) => rule.required() }),
            defineField({ name: "label", type: "internationalizedArrayString", validation: requireEnglish }),
            defineField({
              name: "options",
              type: "array",
              of: [
                {
                  type: "object",
                  name: "factorOption",
                  fields: [
                    defineField({ name: "label", type: "internationalizedArrayString", validation: requireEnglish }),
                    defineField({
                      name: "amount",
                      title: "Amount (cents)",
                      type: "number",
                      description: "Whole cents: US$120 is 12000.",
                      validation: (rule) => rule.required().integer().min(0),
                    }),
                    defineField({ name: "why", type: "internationalizedArrayText", validation: requireEnglish }),
                  ],
                },
              ],
              validation: (rule) => rule.required().min(2),
            }),
          ],
          preview: { select: { title: "id", subtitle: "icon" } },
        },
      ],
      validation: (rule) => rule.required().min(2),
    }),
    defineField({
      name: "presets",
      title: "Example presets",
      type: "object",
      fields: [
        defineField({ name: "lowLabel", type: "internationalizedArrayString", validation: requireEnglish }),
        defineField({ name: "low", title: "Option number per factor (from 0)", type: "array", of: [{ type: "number" }] }),
        defineField({ name: "highLabel", type: "internationalizedArrayString", validation: requireEnglish }),
        defineField({ name: "high", title: "Option number per factor (from 0)", type: "array", of: [{ type: "number" }] }),
      ],
      validation: (rule) =>
        rule.custom((presets: { low?: number[]; high?: number[] } | undefined, ctx) => {
          const factors = (ctx.document?.factors as Factor[] | undefined) ?? [];
          for (const key of ["low", "high"] as const) {
            const picks = presets?.[key] ?? [];
            if (picks.length !== factors.length) return `“${key}” needs one option number per factor (${factors.length}).`;
            const bad = picks.findIndex((p, i) => !Number.isInteger(p) || p < 0 || p >= (factors[i]?.options?.length ?? 0));
            if (bad >= 0) return `“${key}” picks an option that factor ${bad + 1} does not have.`;
          }
          return true;
        }),
    }),
    sampleField,
  ],
  preview: { select: { title: "title", subtitle: "currency" } },
});
