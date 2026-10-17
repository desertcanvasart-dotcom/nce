import { defineArrayMember, defineField, defineType } from "sanity";
import { houseStyle } from "../shared/fields";

/** Editorial body text. Images always carry a description for screen readers (A11Y-006). */
export const richText = defineType({
  name: "richText",
  title: "Text",
  type: "array",
  of: [
    defineArrayMember({
      type: "block",
      styles: [
        { title: "Paragraph", value: "normal" },
        { title: "Heading", value: "h2" },
        { title: "Subheading", value: "h3" },
        { title: "Quote", value: "blockquote" },
      ],
      marks: {
        decorators: [
          { title: "Emphasis", value: "em" },
          { title: "Strong", value: "strong" },
        ],
        annotations: [
          defineArrayMember({
            name: "link",
            type: "object",
            fields: [
              defineField({
                name: "href",
                type: "url",
                validation: (rule) => rule.required().uri({ allowRelative: true, scheme: ["https", "mailto"] }),
              }),
            ],
          }),
        ],
      },
    }),
    defineArrayMember({ type: "figure" }),
  ],
  validation: (rule) => rule.custom(houseStyle),
});

export const figure = defineType({
  name: "figure",
  title: "Photo",
  type: "image",
  options: { hotspot: true },
  fields: [
    defineField({
      name: "alt",
      title: "Description for screen readers",
      type: "string",
      description: "What the photo shows, in one sentence. Leave out “photo of”.",
      validation: (rule) => rule.required().max(300),
    }),
    defineField({ name: "credit", type: "string", description: "Photographer or source, as the licence requires." }),
  ],
});
