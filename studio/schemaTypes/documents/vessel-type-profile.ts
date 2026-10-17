import { InfoOutlineIcon } from "@sanity/icons/InfoOutline";
import { defineField, defineType } from "sanity";
import { houseStyle, languageField, sampleField } from "../shared/fields";
import { iconOptions } from "../shared/icons";

const ROWS = [
  ["guests", "Guests"],
  ["cabins", "Cabins"],
  ["power", "Power"],
  ["pace", "Pace"],
  ["mooring", "Mooring"],
  ["sound", "Sound"],
  ["days", "Days"],
  ["price", "Price"],
] as const;

const METERS = [
  ["intimacy", "Intimacy"],
  ["quiet", "Quiet"],
  ["freeItinerary", "Free itinerary"],
  ["facilities", "Facilities"],
  ["heritage", "Heritage"],
] as const;

/**
 * What each way of sailing is like on board: the data behind VesselTypeCard and VesselCompare
 * (Q25: maintained content, never component defaults). One per vessel type and language.
 */
export const vesselTypeProfile = defineType({
  name: "vesselTypeProfile",
  title: "Vessel type profile",
  type: "document",
  icon: InfoOutlineIcon,
  fields: [
    languageField,
    defineField({
      name: "type",
      title: "Vessel type",
      type: "string",
      options: {
        list: [
          { title: "Sailing dahabiya", value: "sail" },
          { title: "Motor cruise ship", value: "motor" },
          { title: "Paddle steamer", value: "steam" },
        ],
        layout: "radio",
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "name",
      type: "string",
      description: "For example “Sailing dahabiya”.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "short",
      title: "Nickname",
      type: "string",
      validation: (rule) => rule.required().max(60).custom(houseStyle),
    }),
    defineField({
      name: "line",
      title: "One honest sentence",
      type: "text",
      rows: 2,
      validation: (rule) => rule.required().max(200).custom(houseStyle),
    }),
    defineField({
      name: "facts",
      title: "Three facts",
      type: "array",
      of: [
        {
          type: "object",
          name: "fact",
          fields: [
            defineField({ name: "icon", type: "string", options: { list: iconOptions }, validation: (rule) => rule.required() }),
            defineField({ name: "text", type: "string", validation: (rule) => rule.required().max(60).custom(houseStyle) }),
          ],
          preview: { select: { title: "text", subtitle: "icon" } },
        },
      ],
      validation: (rule) => rule.required().length(3),
    }),
    defineField({
      name: "rows",
      title: "Comparison rows",
      type: "object",
      fields: ROWS.map(([name, title]) =>
        defineField({ name, title, type: "string", validation: (rule) => rule.required().max(80) }),
      ),
    }),
    defineField({
      name: "meters",
      title: "Character (1 to 5)",
      description: "Describes character, not quality.",
      type: "object",
      fields: METERS.map(([name, title]) =>
        defineField({ name, title, type: "number", validation: (rule) => rule.required().integer().min(1).max(5) }),
      ),
    }),
    sampleField,
  ],
  preview: { select: { title: "name", subtitle: "language" } },
});
